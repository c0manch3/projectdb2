import { useParams } from 'react-router-dom';

export default function ProjectDetailPage() {
  const { id } = useParams();

  return (
    <div className="p-4 md:p-6">
      <h1 className="page-title mb-6">Project Details</h1>
      <div className="card p-6">
        <p className="text-gray-500">Project ID: {id}</p>
      </div>
    </div>
  );
}
