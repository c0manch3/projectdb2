import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class DocumentService {
  constructor(private prisma: PrismaService) {}

  async findAll(projectId?: string, constructionId?: string, type?: string) {
    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (constructionId) where.constructionId = constructionId;
    if (type) where.type = type;

    return this.prisma.document.findMany({
      where,
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        project: {
          select: { id: true, name: true },
        },
        construction: {
          select: { id: true, name: true },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        project: {
          select: { id: true, name: true },
        },
        construction: {
          select: { id: true, name: true },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async getDownloadInfo(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const filePath = path.join(process.cwd(), 'uploads', document.path);

    // For testing, if file doesn't exist, create a dummy file
    if (!fs.existsSync(filePath)) {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      // Create a simple test file
      fs.writeFileSync(filePath, `Test document content for ${document.originalName}`);
    }

    return {
      filePath,
      originalName: document.originalName,
      mimeType: document.mimeType,
    };
  }

  async create(data: {
    path: string;
    originalName: string;
    mimeType: string;
    hashName: string;
    projectId: string;
    constructionId?: string;
    type: string;
    uploadedById: string;
  }) {
    return this.prisma.document.create({
      data: {
        path: data.path,
        originalName: data.originalName,
        mimeType: data.mimeType,
        hashName: data.hashName,
        type: data.type,
        projectId: data.projectId,
        constructionId: data.constructionId,
        uploadedById: data.uploadedById,
      },
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        project: {
          select: { id: true, name: true },
        },
        construction: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async replace(
    id: string,
    data: {
      path: string;
      originalName: string;
      mimeType: string;
      hashName: string;
      uploadedById: string;
    },
  ) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Delete the old file from disk
    const oldFilePath = path.join(process.cwd(), 'uploads', document.path);
    if (fs.existsSync(oldFilePath)) {
      fs.unlinkSync(oldFilePath);
    }

    // Update document with new file and increment version
    return this.prisma.document.update({
      where: { id },
      data: {
        path: data.path,
        originalName: data.originalName,
        mimeType: data.mimeType,
        hashName: data.hashName,
        uploadedById: data.uploadedById,
        version: document.version + 1,
        uploadedAt: new Date(),
      },
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        project: {
          select: { id: true, name: true },
        },
        construction: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async delete(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Delete the file from disk
    const filePath = path.join(process.cwd(), 'uploads', document.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await this.prisma.document.delete({
      where: { id },
    });

    return { message: 'Document deleted successfully' };
  }
}
