export default function ConstructionsPage() {
  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Constructions</h1>
        <button className="btn-primary">Add Construction</button>
      </div>

      <div className="card p-6">
        <p className="text-gray-500 text-center py-12">
          Constructions list will be displayed here
        </p>
      </div>
    </div>
  );
}
