import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { DocumentService } from './document.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ManagerGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as crypto from 'crypto';
import * as fs from 'fs';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

@Controller('document')
@UseGuards(JwtAuthGuard)
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Get()
  async findAll(
    @Query('projectId') projectId?: string,
    @Query('constructionId') constructionId?: string,
    @Query('type') type?: string,
  ) {
    return this.documentService.findAll(projectId, constructionId, type);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.documentService.findOne(id);
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const { filePath, originalName, mimeType } =
      await this.documentService.getDownloadInfo(id);

    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${originalName}"`,
    );
    res.sendFile(filePath);
  }

  @Post('upload')
  @UseGuards(ManagerGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadsDir,
        filename: (req, file, cb) => {
          const hash = crypto.randomBytes(16).toString('hex');
          const ext = path.extname(file.originalname);
          cb(null, `${hash}${ext}`);
        },
      }),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('projectId') projectId: string,
    @Body('constructionId') constructionId: string | undefined,
    @Body('type') type: string,
    @CurrentUser('sub') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    if (!projectId) {
      throw new BadRequestException('Project ID is required');
    }
    if (!type) {
      throw new BadRequestException('Document type is required');
    }

    return this.documentService.create({
      path: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      hashName: file.filename,
      projectId,
      constructionId: constructionId || undefined,
      type,
      uploadedById: userId,
    });
  }

  @Patch(':id/replace')
  @UseGuards(ManagerGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadsDir,
        filename: (req, file, cb) => {
          const hash = crypto.randomBytes(16).toString('hex');
          const ext = path.extname(file.originalname);
          cb(null, `${hash}${ext}`);
        },
      }),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
      },
    }),
  )
  async replace(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('sub') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.documentService.replace(id, {
      path: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      hashName: file.filename,
      uploadedById: userId,
    });
  }

  @Delete(':id')
  @UseGuards(ManagerGuard)
  async delete(@Param('id') id: string) {
    return this.documentService.delete(id);
  }
}
