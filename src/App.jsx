function App() {
  return (
    <div className="bg-[#0f172a] min-h-screen text-white flex">

      {/* Sidebar */}
      <div className="w-64 bg-[#111827] border-r border-gray-700 p-6">

        <h1 className="text-3xl font-bold text-cyan-400 mb-10">
          PathologyDB
        </h1>

        <div className="space-y-4">

          <button className="w-full bg-cyan-600 hover:bg-cyan-500 transition p-3 rounded-xl">
            Dashboard
          </button>

          <button className="w-full bg-[#1f2937] hover:bg-[#374151] transition p-3 rounded-xl">
            Cases
          </button>

          <button className="w-full bg-[#1f2937] hover:bg-[#374151] transition p-3 rounded-xl">
            Statistics
          </button>

          <button className="w-full bg-[#1f2937] hover:bg-[#374151] transition p-3 rounded-xl">
            Images
          </button>

        </div>

      </div>

      {/* Main */}
      <div className="flex-1 p-8">

        {/* Header */}
        <div className="flex justify-between items-center mb-10">

          <div>
            <h2 className="text-5xl font-bold">
              Histopathology Dashboard
            </h2>

            <p className="text-gray-400 mt-3">
              Scientific data visualization platform
            </p>
          </div>

          <input
            type="text"
            placeholder="Search..."
            className="bg-[#1e293b] border border-gray-700 rounded-xl px-5 py-3 outline-none focus:border-cyan-400"
          />

        </div>

        {/* Cards */}
        <div className="grid grid-cols-3 gap-6 mb-10">

          <div className="bg-[#1e293b] rounded-2xl p-6">
            <p className="text-gray-400">
              Cases
            </p>

            <h3 className="text-5xl font-bold mt-4">
              1,284
            </h3>
          </div>

          <div className="bg-[#1e293b] rounded-2xl p-6">
            <p className="text-gray-400">
              Images
            </p>

            <h3 className="text-5xl font-bold mt-4">
              25,901
            </h3>
          </div>

          <div className="bg-[#1e293b] rounded-2xl p-6">
            <p className="text-gray-400">
              Annotations
            </p>

            <h3 className="text-5xl font-bold mt-4">
              8,192
            </h3>
          </div>

        </div>

        {/* Table */}
        <div className="bg-[#1e293b] rounded-2xl p-6">

          <div className="flex justify-between items-center mb-6">

            <h3 className="text-3xl font-bold">
              Sample Data
            </h3>

            <button className="bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded-xl">
              Export
            </button>

          </div>

          <table className="w-full">

            <thead>

              <tr className="border-b border-gray-700 text-left">

                <th className="p-4">Case ID</th>
                <th className="p-4">Diagnosis</th>
                <th className="p-4">Subtype</th>
                <th className="p-4">Status</th>

              </tr>

            </thead>

            <tbody>

              <tr className="border-b border-gray-800 hover:bg-[#334155] transition">

                <td className="p-4">TCGA-001</td>
                <td className="p-4">Carcinoma</td>
                <td className="p-4">HGSOC</td>
                <td className="p-4 text-green-400">
                  Complete
                </td>

              </tr>

              <tr className="border-b border-gray-800 hover:bg-[#334155] transition">

                <td className="p-4">TCGA-002</td>
                <td className="p-4">Sarcoma</td>
                <td className="p-4">UPS</td>
                <td className="p-4 text-yellow-400">
                  Pending
                </td>

              </tr>

              <tr className="hover:bg-[#334155] transition">

                <td className="p-4">TCGA-003</td>
                <td className="p-4">Glioblastoma</td>
                <td className="p-4">GBM</td>
                <td className="p-4 text-cyan-400">
                  Reviewed
                </td>

              </tr>

            </tbody>

          </table>

        </div>

      </div>

    </div>
  )
}

export default App