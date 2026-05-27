import { useState } from 'react';

export default function App() {
  const [region, setRegion] = useState('na'); 
  const [mapName, setMapName] = useState('Ascent');
  const [partySize, setPartySize] = useState(5); // Default to full stack
  const [players, setPlayers] = useState(['', '', '', '', '']);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const availableMaps = ["Ascent", "Bind", "Lotus", "Haven", "Split", "Icebox", "Breeze", "Sunset", "Abyss", "Pearl"];
  const regions = [
    { value: "na", label: "NA" }, { value: "eu", label: "EU" }, { value: "ap", label: "AP" },
    { value: "kr", label: "KR" }, { value: "latam", label: "LATAM" }, { value: "br", label: "BR" }
  ];

  // Core Preset Group Configuration
  const loadTeamPreset = () => {
    setPartySize(5);
    setPlayers([
      'saakayt#42069',
      'Tsukuyomi#vgnce',
      'JesterOp#3436',
      'Durden#LM8',
      'Dakoochivinci#GoAt'
    ]);
  };

  const handlePlayerChange = (index, value) => {
    const newPlayers = [...players];
    newPlayers[index] = value;
    setPlayers(newPlayers);
  };

  const handlePartySizeChange = (size) => {
    setPartySize(size);
    // Adjust array size buffer cleanly without wiping previous data input
    const newPlayers = [...players];
    while (newPlayers.length < size) newPlayers.push('');
    setPlayers(newPlayers);
  };

  const calculateRoster = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    // Slice input based on chosen party size
    const activeInputs = players.slice(0, partySize);

    const structuredPlayers = activeInputs
      .filter(p => p.trim() !== "")
      .map(p => {
        const [name, tag] = p.split('#');
        return { name: name?.trim() || "", tag: tag?.trim() || "" };
      });

    if (structuredPlayers.length !== partySize) {
        setError(`ERROR: PROFILE SELECTION INCOMPLETE. PLEASE FILL ALL 0${partySize} REQUIRED SLOTS.`);
        setLoading(false);
        return;
    }
    if (structuredPlayers.some(p => !p.name || !p.tag)) {
        setError("ERROR: INVALID ID FORMAT IDENTIFIED. VERIFY ALL SLOTS USE NAME#TAG FORMAT.");
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
      
      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setError("SYSTEM FAILURE: UNABLE TO ESTABLISH ROUTE TO RECOGNITION ENGINES.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0f1923] text-[#ece8e1] p-6 font-sans selection:bg-[#ff4655] selection:text-white">
      
      {/* Brand Header */}
      <div className="max-w-6xl mx-auto border-b border-[#3e4449] pb-4 mb-6 text-center md:text-left">
        <h1 className="text-4xl font-black text-[#ff4655] tracking-tighter uppercase">Tactical Drafter</h1>
        <p className="text-[#8b978f] tracking-widest text-xs font-semibold uppercase mt-1">Strategic Party Permutation Optimizer // Core Engine V4</p>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side Control Panel */}
        <div className="lg:col-span-4 bg-[#1f2326] p-6 border border-[#3e4449] relative flex flex-col justify-between h-fit space-y-6">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#ff4655]"></div>
          
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-[#ff4655] mb-4">Control Terminal</h3>
            
            <div className="space-y-4">
              {/* Queue Party Type Configuration */}
              <div>
                <label className="block text-[10px] font-bold text-[#8b978f] mb-2 uppercase tracking-widest">Queue Composition</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "[ SOLO ]", size: 1 },
                    { label: "[ DUO ]", size: 2 },
                    { label: "[ TRIO ]", size: 3 },
                    { label: "[ 5-STACK ]", size: 5 }
                  ].map((btn) => (
                    <button
                      key={btn.size}
                      type="button"
                      onClick={() => handlePartySizeChange(btn.size)}
                      className={`py-2 text-[11px] font-mono font-bold tracking-wider uppercase transition-colors border ${
                        partySize === btn.size 
                          ? 'bg-[#ff4655] text-white border-[#ff4655]' 
                          : 'bg-[#0f1923] text-[#ece8e1] border-[#3e4449] hover:border-[#ff4655]'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#8b978f] mb-1 uppercase tracking-widest">Server Region</label>
                <select 
                  className="w-full bg-[#0f1923] border border-[#3e4449] rounded-none px-3 py-2 text-sm text-[#ece8e1] focus:outline-none focus:border-[#ff4655] uppercase font-mono"
                  value={region} onChange={(e) => setRegion(e.get.value)}
                >
                  {regions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#8b978f] mb-1 uppercase tracking-widest">Target Arena</label>
                <select 
                  className="w-full bg-[#0f1923] border border-[#3e4449] rounded-none px-3 py-2 text-sm text-[#ece8e1] focus:outline-none focus:border-[#ff4655] uppercase font-mono"
                  value={mapName} onChange={(e) => setMapName(e.target.value)}
                >
                  {availableMaps.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Preset Buttons Layer */}
          <div className="border-t border-[#3e4449]/50 pt-4">
            <h4 className="text-[10px] font-bold text-[#8b978f] mb-2 uppercase tracking-widest">Squad Presets</h4>
            <button 
              onClick={loadTeamPreset}
              className="w-full bg-transparent hover:bg-[#ece8e1] text-[#ece8e1] hover:text-[#0f1923] font-bold py-2 border border-[#ece8e1] transition-all text-xs tracking-widest uppercase font-mono"
            >
              [ Load Team 1 ]
            </button>
          </div>
        </div>

        {/* Right Side Work Area */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Main Slots Input */}
          <div className="bg-[#1f2326] p-6 border border-[#3e4449] relative">
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#ff4655]"></div>
            <h3 className="text-xs font-bold text-[#8b978f] mb-4 uppercase tracking-widest">Active Party Deployment</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
              {players.slice(0, partySize).map((player, index) => (
                <div key={index}>
                  <span className="block text-[9px] font-mono text-[#8b978f] mb-1">MEMBER 0{index + 1}</span>
                  <input
                    type="text"
                    className="w-full bg-[#0f1923] border border-[#3e4449] rounded-none px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#ff4655] transition-colors placeholder-[#2c3237]"
                    value={player} onChange={(e) => handlePlayerChange(index, e.target.value)}
                    placeholder="NAME#TAG"
                  />
                </div>
              ))}
            </div>

            <button 
              onClick={calculateRoster} disabled={loading}
              className={`w-full font-bold py-3 uppercase tracking-widest text-sm transition-all border-2 ${
                loading ? 'bg-[#3e4449] border-[#3e4449] text-[#8b978f] cursor-wait' : 'bg-[#ff4655] hover:bg-transparent hover:text-[#ff4655] border-[#ff4655] text-white'
              }`}
            >
              {loading ? 'Analyzing Strategy Alignment...' : 'Analyze Pool Synergy'}
            </button>

            {error && <div className="mt-4 p-3 bg-[#ff4655]/10 border-l-4 border-[#ff4655] text-[#ff4655] font-mono text-xs uppercase font-bold">{error}</div>}
          </div>

          {/* Calculation Results Card */}
          {result && (
            <div className="bg-[#1f2326] p-6 border border-[#3e4449]">
              <div className="flex justify-between items-end mb-6 border-b border-[#3e4449] pb-4">
                  <div>
                      <h2 className="text-2xl font-black uppercase tracking-tighter">Draft Authorization</h2>
                      <p className="text-[#8b978f] font-mono text-[10px] mt-0.5">ZONE // {result.map.toUpperCase()}</p>
                  </div>
                  <div className="text-right">
                      <p className="text-[10px] font-bold text-[#8b978f] uppercase tracking-widest">Cumulative Impact</p>
                      <p className="text-3xl font-black text-[#ff4655]">{result.total_score}</p>
                  </div>
              </div>
              
              {/* Output Roles */}
              <div className="space-y-3">
                {result.roster.map((slot, index) => (
                  <div key={index} className="flex justify-between items-center bg-[#0f1923] p-4 border-l-4 border-[#ff4655] group">
                    <div>
                      <p className="font-bold text-base tracking-tight text-white group-hover:text-[#ff4655] transition-colors font-mono">{slot.player.toUpperCase()}</p>
                      <p className="text-[10px] text-[#8b978f] font-bold tracking-wider uppercase mt-0.5">ASSIGNED META ROLE // {slot.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-xl uppercase tracking-tighter text-white">{slot.agent}</p>
                      <p className="text-[10px] text-[#8b978f] font-mono mt-0.5">COMFORT RATING: <span className="text-[#ff4655]">{slot.score}</span>/100</p>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
