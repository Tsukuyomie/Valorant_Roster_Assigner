import { useState } from 'react';

export default function App() {
  const [region, setRegion] = useState('na'); 
  const [mapName, setMapName] = useState('Ascent');
  const [players, setPlayers] = useState(['Player1#1111', 'Player2#2222', 'Player3#3333', 'Player4#4444', 'Player5#5555']);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const availableMaps = [
    "Ascent", "Bind", "Lotus", "Haven", "Split", 
    "Icebox", "Breeze", "Sunset", "Abyss", "Pearl"
  ];

  const regions = [
    { value: "na", label: "NA" },
    { value: "eu", label: "EU" },
    { value: "ap", label: "AP" },
    { value: "kr", label: "KR" },
    { value: "latam", label: "LATAM" },
    { value: "br", label: "BR" }
  ];

  const handlePlayerChange = (index, value) => {
    const newPlayers = [...players];
    newPlayers[index] = value;
    setPlayers(newPlayers);
  };

  const calculateRoster = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    const structuredPlayers = players.map(p => {
      const [name, tag] = p.split('#');
      return { name: name?.trim() || "", tag: tag?.trim() || "" };
    });

    if (structuredPlayers.some(p => !p.name || !p.tag)) {
        setError("ERROR: INVALID ID FORMAT (EXPECTED NAME#TAG)");
        setLoading(false);
        return;
    }

    try {
      const response = await fetch('https://valorant-roster-assigner.onrender.com/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          region: region,
          map_name: mapName, 
          players: structuredPlayers 
        })
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error("Failed to execute advanced optimization:", err);
      setError("SYSTEM FAILURE: UNABLE TO REACH OPTIMIZATION ENGINE.");
    }
    setLoading(false);
  };

  return (
    // The main background uses the official Valorant dark navy color
    <div className="min-h-screen bg-[#0f1923] text-[#ece8e1] p-8 font-sans selection:bg-[#ff4655] selection:text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header - Aggressive Uppercase Typography */}
        <div className="text-center border-b border-[#3e4449] pb-6">
          <h1 className="text-5xl font-black text-[#ff4655] mb-2 tracking-tighter uppercase">Roster Optimizer</h1>
          <p className="text-[#8b978f] tracking-widest text-sm font-semibold uppercase">Powered by Advanced Match Metrics</p>
        </div>

        {/* Input Section - Sharp edges, dark inner panels */}
        <div className="bg-[#1f2326] p-8 border border-[#3e4449] relative">
          {/* Decorative Corner Accent */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#ff4655]"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#ff4655]"></div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-xs font-bold text-[#8b978f] mb-2 uppercase tracking-widest">Server Region</label>
              <select 
                className="w-full bg-[#0f1923] border border-[#3e4449] rounded-none px-4 py-3 text-[#ece8e1] focus:outline-none focus:border-[#ff4655] transition-colors uppercase font-semibold"
                value={region} 
                onChange={(e) => setRegion(e.target.value)}
              >
                {regions.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#8b978f] mb-2 uppercase tracking-widest">Target Map</label>
              <select 
                className="w-full bg-[#0f1923] border border-[#3e4449] rounded-none px-4 py-3 text-[#ece8e1] focus:outline-none focus:border-[#ff4655] transition-colors uppercase font-semibold"
                value={mapName} 
                onChange={(e) => setMapName(e.target.value)}
              >
                {availableMaps.map(map => (
                    <option key={map} value={map}>{map.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          <label className="block text-xs font-bold text-[#8b978f] mb-2 uppercase tracking-widest">Player Lineup (Riot ID)</label>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            {players.map((player, index) => (
              <input
                key={index}
                type="text"
                className="bg-[#0f1923] border border-[#3e4449] rounded-none px-4 py-3 text-[#ece8e1] focus:outline-none focus:border-[#ff4655] transition-colors text-sm font-mono placeholder-[#3e4449]"
                value={player}
                onChange={(e) => handlePlayerChange(index, e.target.value)}
                placeholder={`PLAYER 0${index + 1}`}
              />
            ))}
          </div>

          <button 
            onClick={calculateRoster}
            disabled={loading}
            className={`w-full font-bold py-4 uppercase tracking-widest transition-all duration-200 border-2 ${
              loading 
                ? 'bg-[#3e4449] text-[#8b978f] border-[#3e4449] cursor-wait' 
                : 'bg-[#ff4655] hover:bg-transparent hover:text-[#ff4655] hover:border-[#ff4655] text-white border-[#ff4655]'
            }`}
          >
            {loading ? 'Crunching Metrics...' : 'Lock In Roster'}
          </button>

          {error && (
              <div className="mt-6 p-4 bg-[#ff4655]/10 border-l-4 border-[#ff4655] text-[#ff4655] font-mono text-sm uppercase font-bold">
                  {error}
              </div>
          )}
        </div>

        {/* Output Section */}
        {result && (
          <div className="bg-[#1f2326] p-8 border border-[#3e4449] relative">
            <div className="flex justify-between items-end mb-8 border-b border-[#3e4449] pb-4">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Optimal Draft</h2>
                    <p className="text-[#8b978f] font-mono text-xs mt-1">MAP // {result.map.toUpperCase()}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-[#8b978f] uppercase tracking-widest">Synergy Index</p>
                    <p className="text-4xl font-black text-[#ff4655]">{result.total_score}</p>
                </div>
            </div>
            
            <div className="space-y-4">
              {result.roster.map((slot, index) => (
                <div key={index} className="flex justify-between items-center bg-[#0f1923] p-5 border-l-4 border-[#3e4449] hover:border-[#ff4655] transition-colors duration-300 group">
                  <div>
                    <p className="font-bold text-xl tracking-tight text-white group-hover:text-[#ff4655] transition-colors">{slot.player.toUpperCase()}</p>
                    <p className="text-xs text-[#8b978f] font-bold tracking-widest uppercase mt-1">{slot.role}</p>
                  </div>
                  <div className="text-right flex items-center gap-6">
                    <div className="text-right">
                        <p className={`font-black text-2xl uppercase tracking-tighter ${slot.agent === 'No Data / Unplayed' ? 'text-[#8b978f]' : 'text-white'}`}>
                            {slot.agent}
                        </p>
                        <p className="text-xs text-[#8b978f] font-mono mt-1">
                            MASTERY: <span className={slot.agent === 'No Data / Unplayed' ? 'text-[#8b978f]' : 'text-[#ff4655]'}>{slot.score}</span>
                        </p>
                    </div>
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
