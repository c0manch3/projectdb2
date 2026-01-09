export default function ProjectsPage() {
  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Projects</h1>
        <button className="btn-primary">Add Project</button>
      </div>

      <div className="card p-6">
        <p className="text-gray-500 text-center py-12">
          Projects list will be displayed here
        </p>
      </div>
    </div>
  );
}
