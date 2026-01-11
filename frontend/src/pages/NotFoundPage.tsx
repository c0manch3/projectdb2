import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-primary-600">404</h1>
        <p className="text-2xl font-semibold text-gray-900 mt-4">
          {t('errors.pageNotFound')}
        </p>
        <p className="text-gray-600 mt-2 mb-8">
          {t('errors.pageNotFoundMessage')}
        </p>
        <Link to="/" className="btn-primary">
          {t('errors.goHome')}
        </Link>
      </div>
    </div>
  );
}
