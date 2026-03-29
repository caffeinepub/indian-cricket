import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import type { Player } from "../store/gameStore";
import { useGameStore } from "../store/gameStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function TeamEditorModal({ open, onClose }: Props) {
  const store = useGameStore();

  const [teamName, setTeamName] = useState(store.teamName);
  const [opponentName, setOpponentName] = useState(store.opponentName);
  const [maxOvers, setMaxOvers] = useState(store.maxOvers);
  const [primaryColor, setPrimaryColor] = useState(store.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(store.secondaryColor);
  const [helmetColor, setHelmetColor] = useState(store.helmetColor);
  const [batColor, setBatColor] = useState(store.batColor);
  const [padsColor, setPadsColor] = useState(store.padsColor);
  const [glovesColor, setGlovesColor] = useState(store.glovesColor);
  const [skinTone, setSkinTone] = useState(store.skinTone);
  const [players, setPlayers] = useState<Player[]>(() =>
    store.players.map((p) => ({ ...p })),
  );

  useEffect(() => {
    if (open) {
      setTeamName(store.teamName);
      setOpponentName(store.opponentName);
      setMaxOvers(store.maxOvers);
      setPrimaryColor(store.primaryColor);
      setSecondaryColor(store.secondaryColor);
      setHelmetColor(store.helmetColor);
      setBatColor(store.batColor);
      setPadsColor(store.padsColor);
      setGlovesColor(store.glovesColor);
      setSkinTone(store.skinTone);
      setPlayers(store.players.map((p) => ({ ...p })));
    }
  }, [
    open,
    store.teamName,
    store.opponentName,
    store.maxOvers,
    store.primaryColor,
    store.secondaryColor,
    store.helmetColor,
    store.batColor,
    store.padsColor,
    store.glovesColor,
    store.skinTone,
    store.players,
  ]);

  const updatePlayer = (
    id: number,
    field: keyof Player,
    value: string | number,
  ) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  };

  const handleSave = () => {
    store.setTeamSettings({
      teamName,
      opponentName,
      players,
      primaryColor,
      secondaryColor,
      maxOvers,
      helmetColor,
      batColor,
      padsColor,
      glovesColor,
      skinTone,
    });
    store.saveTeamSettings();
    onClose();
  };

  const accent = primaryColor;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.75)", zIndex: 100 }}
          data-ocid="team_editor.modal"
        >
          <motion.div
            initial={{ scale: 0.92, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 16, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full max-w-lg mx-4 rounded-2xl flex flex-col"
            style={{
              background: "#0B2E4E",
              border: `1.5px solid ${accent}55`,
              boxShadow: `0 8px 60px rgba(0,0,0,0.7), 0 0 40px ${accent}22`,
              maxHeight: "90vh",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 shrink-0"
              style={{ borderBottom: `1px solid ${accent}33` }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-1.5 flex-col overflow-hidden rounded-full">
                  <div className="flex-1" style={{ background: "#FF9933" }} />
                  <div className="flex-1 bg-white" />
                  <div
                    className="flex-1"
                    style={{ background: secondaryColor }}
                  />
                </div>
                <span
                  className="font-display text-lg font-extrabold tracking-widest uppercase"
                  style={{ color: accent }}
                >
                  Team Editor
                </span>
              </div>
              <button
                type="button"
                data-ocid="team_editor.close_button"
                onClick={onClose}
                className="text-white/40 hover:text-white/80 transition-colors text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Scrollable body */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="px-6 py-5 flex flex-col gap-6">
                {/* Team names */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label
                      htmlFor="te-team-name"
                      className="text-white/60 text-xs uppercase tracking-wider font-medium"
                    >
                      Team Name
                    </Label>
                    <Input
                      id="te-team-name"
                      data-ocid="team_editor.input"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-orange-400"
                      placeholder="India"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label
                      htmlFor="te-opponent-name"
                      className="text-white/60 text-xs uppercase tracking-wider font-medium"
                    >
                      Opponent Name
                    </Label>
                    <Input
                      id="te-opponent-name"
                      data-ocid="team_editor.input"
                      value={opponentName}
                      onChange={(e) => setOpponentName(e.target.value)}
                      className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-orange-400"
                      placeholder="Australia"
                    />
                  </div>
                </div>

                {/* Max overs */}
                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="te-max-overs"
                    className="text-white/60 text-xs uppercase tracking-wider font-medium"
                  >
                    Max Overs (per innings)
                  </Label>
                  <Input
                    id="te-max-overs"
                    data-ocid="team_editor.input"
                    type="number"
                    min={1}
                    max={50}
                    value={maxOvers}
                    onChange={(e) =>
                      setMaxOvers(
                        Math.max(1, Math.min(50, Number(e.target.value))),
                      )
                    }
                    className="bg-white/5 border-white/15 text-white w-28 focus:border-orange-400"
                  />
                </div>

                {/* Kit Colors */}
                <div className="flex flex-col gap-3">
                  <span className="text-white/60 text-xs uppercase tracking-wider font-medium">
                    Kit Colors
                  </span>
                  <div className="flex gap-6">
                    <ColorSwatch
                      id="te-primary-color"
                      label="Primary"
                      value={primaryColor}
                      onChange={setPrimaryColor}
                    />
                    <ColorSwatch
                      id="te-secondary-color"
                      label="Secondary"
                      value={secondaryColor}
                      onChange={setSecondaryColor}
                    />
                    <div className="flex flex-col gap-2 items-center ml-4">
                      <Label className="text-white/50 text-xs uppercase tracking-wider">
                        Kit Preview
                      </Label>
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, ${primaryColor} 50%, ${secondaryColor} 50%)`,
                          border: "2px solid rgba(255,255,255,0.15)",
                        }}
                      >
                        <span className="text-white font-bold text-lg">🏏</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gear & Appearance */}
                <div className="flex flex-col gap-3">
                  <span className="text-white/60 text-xs uppercase tracking-wider font-medium">
                    Gear & Appearance
                  </span>
                  <div className="flex gap-4 flex-wrap">
                    <ColorSwatch
                      id="te-skin-tone"
                      label="Skin Tone"
                      value={skinTone}
                      onChange={setSkinTone}
                    />
                    <ColorSwatch
                      id="te-helmet-color"
                      label="Helmet"
                      value={helmetColor}
                      onChange={setHelmetColor}
                    />
                    <ColorSwatch
                      id="te-pads-color"
                      label="Pads"
                      value={padsColor}
                      onChange={setPadsColor}
                    />
                    <ColorSwatch
                      id="te-gloves-color"
                      label="Gloves"
                      value={glovesColor}
                      onChange={setGlovesColor}
                    />
                    <ColorSwatch
                      id="te-bat-color"
                      label="Bat"
                      value={batColor}
                      onChange={setBatColor}
                    />
                  </div>
                </div>

                {/* Players */}
                <div className="flex flex-col gap-3">
                  <span className="text-white/60 text-xs uppercase tracking-wider font-medium">
                    Players
                  </span>
                  <div className="flex flex-col gap-2">
                    {players.map((player, i) => (
                      <div
                        key={player.id}
                        className="flex items-center gap-3"
                        data-ocid={`team_editor.item.${i + 1}`}
                      >
                        <span className="text-white/25 text-xs font-mono w-4 text-right shrink-0">
                          {i + 1}
                        </span>
                        <Input
                          type="number"
                          min={1}
                          max={999}
                          value={player.jerseyNumber}
                          onChange={(e) =>
                            updatePlayer(
                              player.id,
                              "jerseyNumber",
                              Number(e.target.value),
                            )
                          }
                          className="bg-white/5 border-white/15 text-white text-center focus:border-orange-400 shrink-0"
                          style={{ width: "64px" }}
                        />
                        <Input
                          value={player.name}
                          onChange={(e) =>
                            updatePlayer(player.id, "name", e.target.value)
                          }
                          className="bg-white/5 border-white/15 text-white flex-1 focus:border-orange-400"
                          placeholder={`Player ${i + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Footer */}
            <div
              className="flex gap-3 px-6 py-4 shrink-0"
              style={{ borderTop: `1px solid ${accent}33` }}
            >
              <Button
                data-ocid="team_editor.save_button"
                onClick={handleSave}
                className="flex-1 font-bold uppercase tracking-wider"
                style={{ background: accent, color: "#0B2E4E", border: "none" }}
              >
                Save Settings
              </Button>
              <Button
                data-ocid="team_editor.cancel_button"
                variant="outline"
                onClick={onClose}
                className="flex-1 uppercase tracking-wider"
                style={{
                  background: "transparent",
                  color: "rgba(255,255,255,0.6)",
                  borderColor: "rgba(255,255,255,0.2)",
                }}
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ColorSwatch({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 items-center">
      <Label
        htmlFor={id}
        className="text-white/50 text-xs uppercase tracking-wider"
      >
        {label}
      </Label>
      <input
        id={id}
        data-ocid="team_editor.input"
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-12 h-12 rounded-xl cursor-pointer border-2 p-1"
        style={{
          borderColor: `${value}88`,
          background: "rgba(255,255,255,0.05)",
        }}
      />
      <span className="text-white/40 text-xs font-mono">{value}</span>
    </div>
  );
}
