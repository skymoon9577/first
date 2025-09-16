import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import { Plus, Trash2, Dice5, History, Filter, Shuffle, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// --- Types
interface MenuItem {
  id: string;
  name: string;
  price?: number; // KRW
  tags: string[]; // e.g. "한식", "매움", "채식"
  weight: number; // selection weight 1~5
}

interface HistoryItem {
  id: string;
  name: string;
  date: string; // ISO
}

// --- Helpers
const uid = () => Math.random().toString(36).slice(2, 9);
const KRW = (n?: number) => (n == null || Number.isNaN(n) ? "-" : n.toLocaleString());

const defaultSeed: MenuItem[] = [
  { id: uid(), name: "김치찌개", price: 9000, tags: ["한식", "국물", "매움"], weight: 3 },
  { id: uid(), name: "비빔밥", price: 10000, tags: ["한식", "채식옵션"], weight: 2 },
  { id: uid(), name: "돈까스", price: 11000, tags: ["일식"], weight: 2 },
  { id: uid(), name: "쌀국수", price: 12000, tags: ["아시안", "국물"], weight: 2 },
  { id: uid(), name: "버거", price: 9500, tags: ["양식"], weight: 1 },
];

const LS_KEY = "lunch-game-v1";

function saveLS(items: MenuItem[], history: HistoryItem[]) {
  localStorage.setItem(LS_KEY, JSON.stringify({ items, history }));
}
function loadLS(): { items: MenuItem[]; history: HistoryItem[] } | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const { items, history } = JSON.parse(raw);
    return { items, history };
  } catch (e) {
    return null;
  }
}

// Weighted random pick
function pickWeighted<T extends { weight: number }>(list: T[]) {
  const total = list.reduce((s, x) => s + Math.max(1, x.weight), 0);
  let r = Math.random() * total;
  for (const x of list) {
    r -= Math.max(1, x.weight);
    if (r <= 0) return x;
  }
  return list[0];
}

// --- Component
export default function LunchMenuGame() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState<string>("");
  const [tagInput, setTagInput] = useState("");
  const [excludeTags, setExcludeTags] = useState<string[]>([]);
  const [budget, setBudget] = useState<number | null>(null);
  const [avoidRecent, setAvoidRecent] = useState(true);
  const [avoidDays, setAvoidDays] = useState(5);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<MenuItem | null>(null);
  const wheel = useAnimationControls();

  // Load / seed
  useEffect(() => {
    const saved = loadLS();
    if (saved) {
      setItems(saved.items);
      setHistory(saved.history);
    } else {
      setItems(defaultSeed);
      setHistory([]);
    }
  }, []);

  // Persist
  useEffect(() => {
    saveLS(items, history);
  }, [items, history]);

  const tagsUniverse = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => i.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoff = now - avoidDays * 24 * 60 * 60 * 1000;

    return items.filter((m) => {
      if (budget != null && m.price != null && m.price > budget) return false;
      if (excludeTags.length && excludeTags.some((t) => m.tags.includes(t))) return false;
      if (avoidRecent) {
        const recent = history.find((h) => h.name === m.name && new Date(h.date).getTime() >= cutoff);
        if (recent) return false;
      }
      return true;
    });
  }, [items, budget, excludeTags, avoidRecent, avoidDays, history]);

  const handleAdd = () => {
    const t = tagInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const p = price ? Number(price.replace(/[^0-9]/g, "")) : undefined;
    if (!name.trim()) return;
    const newItem: MenuItem = { id: uid(), name: name.trim(), price: p, tags: t, weight: 2 };
    setItems((prev) => [newItem, ...prev]);
    setName("");
    setPrice("");
    setTagInput("");
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((x) => x.id !== id));

  const toggleExclude = (tag: string) =>
    setExcludeTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const spin = async () => {
    if (!filtered.length) {
      setResult(null);
      return;
    }
    setSpinning(true);
    setResult(null);
    // spin animation
    await wheel.start({ rotate: 0 });
    await wheel.start({ rotate: 1080, transition: { duration: 1.2, ease: "easeInOut" } });
    const choice = pickWeighted(filtered);
    setResult(choice);
    setSpinning(false);

    // record history
    setHistory((h) => [{ id: uid(), name: choice.name, date: new Date().toISOString() }, ...h].slice(0, 30));
  };

  const clearHistory = () => setHistory([]);

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🍱 점심 메뉴 고르는 게임</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={spin} disabled={spinning || !filtered.length}>
            {spinning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Dice5 className="mr-2 h-4 w-4" />}뽑기
          </Button>
        </div>
      </header>

      {/* Controls */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" /> 조건/제약
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm">예산 상한 (₩)</Label>
              <div className="flex items-center gap-3">
                <Input
                  inputMode="numeric"
                  placeholder="예: 10000"
                  value={budget ?? ""}
                  onChange={(e) => setBudget(e.target.value ? Number(e.target.value.replace(/[^0-9]/g, "")) : null)}
                />
                <Button variant="secondary" onClick={() => setBudget(null)}>초기화</Button>
              </div>
            </div>
            <div>
              <Label className="text-sm">최근 선택 회피</Label>
              <div className="flex items-center gap-3">
                <Switch checked={avoidRecent} onCheckedChange={setAvoidRecent} />
                <span className="text-sm text-muted-foreground">최근 {avoidDays}일 내 선택 제외</span>
              </div>
              <Slider value={[avoidDays]} min={0} max={14} step={1} onValueChange={(v) => setAvoidDays(v[0])} />
            </div>

            <div>
              <Label className="text-sm">제외할 태그</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {tagsUniverse.length ? (
                  tagsUniverse.map((t) => (
                    <button
                      key={t}
                      className={`text-xs px-2 py-1 rounded-full border ${
                        excludeTags.includes(t) ? "bg-primary text-primary-foreground" : "bg-background"
                      }`}
                      onClick={() => toggleExclude(t)}
                    >
                      {t}
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">아직 태그가 없어요. 아래에서 메뉴를 추가해 보세요.</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add item */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" /> 메뉴 추가
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-2">
              <Label className="text-sm">이름</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 제육볶음" />
            </div>
            <div>
              <Label className="text-sm">가격(₩)</Label>
              <Input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="예: 9000" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm">태그(쉼표로 구분)</Label>
              <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="한식, 매움, 채식" />
            </div>
            <div className="flex flex-col">
              <Label className="text-sm">가중치</Label>
              <Slider
                value={[Number(items.find((i) => i.name === name)?.weight ?? 2)]}
                min={1}
                max={5}
                step={1}
                onValueChange={() => {}}
                disabled
              />
              <span className="text-xs text-muted-foreground mt-1">추가 후 항목별로 조정하세요</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" /> 추가
            </Button>
            <Button variant="outline" onClick={() => { setName(""); setPrice(""); setTagInput(""); }}>초기화</Button>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shuffle className="h-4 w-4" /> 후보 ({filtered.length}/{items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">아직 항목이 없어요. 위에서 메뉴를 추가해 주세요.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map((m) => (
                <Card key={m.id} className={filtered.includes(m) ? "" : "opacity-50"}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold">{m.name}</div>
                        <div className="text-sm text-muted-foreground">₩{KRW(m.price)}</div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {m.tags.map((t) => (
                            <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Label className="text-xs">가중치</Label>
                          <Slider
                            className="w-24"
                            value={[m.weight]}
                            min={1}
                            max={5}
                            step={1}
                            onValueChange={(v) =>
                              setItems((prev) => prev.map((x) => (x.id === m.id ? { ...x, weight: v[0] } : x)))
                            }
                          />
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => removeItem(m.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Spin result */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="border-primary">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">🎉 오늘의 점심</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="text-xl font-bold">{result.name}</div>
                  <div className="text-sm text-muted-foreground">₩{KRW(result.price)} · {result.tags.join(", ")}</div>
                </div>
                <motion.div animate={wheel}>
                  <div className="w-16 h-16 rounded-full border-4 grid place-items-center">
                    🎲
                  </div>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" /> 최근 기록
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">기록이 아직 없어요.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {history.map((h) => (
                <Badge key={h.id} variant="outline" className="text-xs">
                  {new Date(h.date).toLocaleDateString()} · {h.name}
                </Badge>
              ))}
            </div>
          )}
          {history.length > 0 && (
            <div className="mt-3">
              <Button variant="outline" onClick={clearHistory}>기록 비우기</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <footer className="text-xs text-muted-foreground pt-4">
        <p>💡 팁: 구성원과 함께 쓸 땐 각자 메뉴를 추가하고, 제외 태그로 알레르기/기피 음식을 체크하세요. 가중치로 선호도를 반영할 수 있어요.</p>
      </footer>
    </div>
  );
}
