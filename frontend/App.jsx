import { useState } from 'react';

export default function App() {
  const [mapName, setMapName] = useState('Ascent');
  const [players, setPlayers] = useState(['TenZ', 'Boaster', 'ShahZaM', 'FNS', 'Asuna']);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Handle changing individual player names
  const handlePlayerChange = (index, value) => {
    const newPlayers = [...players];
    newPlayers[index] = value;
    setPlayers(newPlayers);
  };

 const calculateRoster = async () => {
  setLoading(true);
  
  // Map the text inputs (e.g., "TenZ#0505") into the structured format required by FastAPI
  const structuredPlayers = players.map(p => {
    const [name, tag] = p.split('#');
    return { name: name?.trim() || "", tag: tag?.trim() || "" };
  });

  try {
    const response = await fetch('https://valorant-roster-assigner.onrender.com/api/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        map_name: mapName, 
        players: structuredPlayers 
      })
    });
    const data = await response.json();
    setResult(data);
  } catch (error) {
    console.error("Failed to execute real-time optimization:", error);
  }
  setLoading(false);
};

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-500 mb-2">VALORANT Roster Optimizer</h1>
          <p className="text-slate-400">Find the mathematically optimal team composition.</p>
        </div>

        {/* Input Section */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">Select Map</label>
            <select 
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500"
              value={mapName} 
              onChange={(e) => setMapName(e.target.value)}
            >
              <option value="Ascent">Ascent</option>
              <option value="Bind">Bind</option>
              <option value="Lotus">Lotus</option>
            </select>
          </div>

          <label className="block text-sm font-medium text-slate-300 mb-2">Player IDs</label>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            {players.map((player, index) => (
              <input
                key={index}
                type="text"
                className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500"
                value={player}
                onChange={(e) => handlePlayerChange(index, e.target.value)}
                placeholder={`Player ${index + 1}`}
              />
            ))}
          </div>

          <button 
            onClick={calculateRoster}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors flex justify-center items-center"
          >
            {loading ? 'Crunching Data...' : 'Generate Optimal Roster'}
          </button>
        </div>

        {/* Output Section */}
        {result && (
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
            <h2 className="text-2xl font-bold mb-4">Total Synergy Score: <span className="text-red-400">{result.total_score}</span></h2>
            
            <div className="space-y-3">
              {result.roster.map((slot, index) => (
                <div key={index} className="flex justify-between items-center bg-slate-900 p-4 rounded-lg border border-slate-700">
                  <div>
                    <p className="font-bold text-lg">{slot.player}</p>
                    <p className="text-sm text-slate-400">{slot.role}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-400">{slot.agent}</p>
                    <p className="text-sm text-slate-500">Score: {slot.score}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
