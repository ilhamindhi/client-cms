"use client";

import { useEffect, useState } from "react";
import { Flag, RefreshCw } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Table, { TableCell, TableHead, TableRow } from "@/components/ui/Table";
import {
  archiveAchievementAdmin,
  archiveChallengeAdmin,
  createAchievementAdmin,
  createChallengeAdmin,
  listAchievementsAdmin,
  listChallengesAdmin,
  updateAchievementAdmin,
  updateChallengeAdmin,
} from "@/lib/api/challenges";
import { useFeedbackToast } from "@/lib/hooks/use-feedback-toast";
import { useAuthStore } from "@/lib/stores/auth-store";
import { formatDateTime } from "@/lib/utils";

const ACHIEVEMENT_TARGET_METRICS = [
  "sessions_completed",
  "challenges_completed",
  "distance_km_total",
  "duration_min_total",
] as const;

type AchievementTargetMetric = (typeof ACHIEVEMENT_TARGET_METRICS)[number];

function asNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function asBoolean(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export default function ChallengesPage() {
  const { accessToken, hasRole } = useAuthStore();
  const hasAdminAccess = hasRole("admin") || hasRole("superadmin");

  const [loading, setLoading] = useState(false);
  const [challenges, setChallenges] = useState<Record<string, unknown>[]>([]);
  const [achievements, setAchievements] = useState<Record<string, unknown>[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  useFeedbackToast({
    error: pageError,
    success: pageMessage,
    errorTitle: "Challenges",
    successTitle: "Challenges",
  });

  const [challengeTitle, setChallengeTitle] = useState("");
  const [challengeDifficulty, setChallengeDifficulty] = useState("beginner");
  const [challengeRewardPoints, setChallengeRewardPoints] = useState("0");

  const [achievementCode, setAchievementCode] = useState("");
  const [achievementTitle, setAchievementTitle] = useState("");
  const [achievementDescription, setAchievementDescription] = useState("");
  const [achievementIcon, setAchievementIcon] = useState("trophy");

  const [challengeEditModalOpen, setChallengeEditModalOpen] = useState(false);
  const [challengeEditModalSaving, setChallengeEditModalSaving] = useState(false);
  const [challengeEditId, setChallengeEditId] = useState("");
  const [challengeEditTitle, setChallengeEditTitle] = useState("");
  const [challengeEditDifficulty, setChallengeEditDifficulty] = useState("beginner");
  const [challengeEditRewardPoints, setChallengeEditRewardPoints] = useState("0");
  const [challengeEditDescription, setChallengeEditDescription] = useState("");
  const [challengeEditIsActive, setChallengeEditIsActive] = useState(true);

  const [achievementEditModalOpen, setAchievementEditModalOpen] = useState(false);
  const [achievementEditModalSaving, setAchievementEditModalSaving] = useState(false);
  const [achievementEditId, setAchievementEditId] = useState("");
  const [achievementEditCode, setAchievementEditCode] = useState("");
  const [achievementEditTitle, setAchievementEditTitle] = useState("");
  const [achievementEditDescription, setAchievementEditDescription] = useState("");
  const [achievementEditIcon, setAchievementEditIcon] = useState("trophy");
  const [achievementEditTargetMetric, setAchievementEditTargetMetric] = useState<"" | AchievementTargetMetric>("");
  const [achievementEditTargetValue, setAchievementEditTargetValue] = useState("");
  const [achievementEditIsActive, setAchievementEditIsActive] = useState(true);

  function clearFeedback() {
    setPageError(null);
    setPageMessage(null);
  }

  async function loadData() {
    if (!accessToken || !hasAdminAccess) return;

    setLoading(true);
    setPageError(null);
    try {
      const [challengeRows, achievementRows] = await Promise.all([
        listChallengesAdmin(accessToken, { limit: 100, offset: 0 }),
        listAchievementsAdmin(accessToken, { limit: 100, offset: 0 }),
      ]);
      setChallenges(challengeRows);
      setAchievements(achievementRows);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to load challenge data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, hasAdminAccess]);

  async function onCreateChallenge(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    if (!challengeTitle.trim()) {
      setPageError("Challenge title wajib diisi.");
      return;
    }

    clearFeedback();
    try {
      await createChallengeAdmin(accessToken, {
        title: challengeTitle.trim(),
        difficulty: challengeDifficulty.trim(),
        reward_points: Math.max(0, Math.floor(asNumber(challengeRewardPoints, 0))),
        is_active: true,
      });
      setChallengeTitle("");
      setChallengeDifficulty("beginner");
      setChallengeRewardPoints("0");
      setPageMessage("Challenge created.");
      await loadData();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to create challenge");
    }
  }

  function onPrepareChallengeEdit(item: Record<string, unknown>) {
    setChallengeEditId(String(item.id ?? ""));
    setChallengeEditTitle(String(item.title ?? ""));
    setChallengeEditDifficulty(String(item.difficulty ?? "beginner"));
    setChallengeEditRewardPoints(String(item.reward_points ?? "0"));
    setChallengeEditDescription(String(item.description ?? ""));
    setChallengeEditIsActive(asBoolean(item.is_active, true));
    setChallengeEditModalOpen(true);
  }

  async function onUpdateChallenge() {
    if (!accessToken || !challengeEditId.trim()) return;
    if (!challengeEditTitle.trim()) {
      setPageError("Challenge title wajib diisi.");
      return;
    }

    clearFeedback();
    setChallengeEditModalSaving(true);
    try {
      await updateChallengeAdmin(accessToken, challengeEditId.trim(), {
        title: challengeEditTitle.trim(),
        difficulty: challengeEditDifficulty.trim(),
        reward_points: Math.max(0, Math.floor(asNumber(challengeEditRewardPoints, 0))),
        description: asOptionalText(challengeEditDescription),
        is_active: challengeEditIsActive,
      });
      setPageMessage(`Challenge ${challengeEditId.trim()} updated.`);
      setChallengeEditModalOpen(false);
      await loadData();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to update challenge");
    } finally {
      setChallengeEditModalSaving(false);
    }
  }

  async function onArchiveChallenge(id: string) {
    if (!accessToken || !id.trim()) return;

    clearFeedback();
    try {
      await archiveChallengeAdmin(accessToken, id);
      setPageMessage(`Challenge ${id} archived.`);
      await loadData();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to archive challenge");
    }
  }

  async function onCreateAchievement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    if (!achievementCode.trim() || !achievementTitle.trim() || !achievementDescription.trim()) {
      setPageError("Code, title, dan description achievement wajib diisi.");
      return;
    }

    clearFeedback();
    try {
      await createAchievementAdmin(accessToken, {
        code: achievementCode.trim(),
        title: achievementTitle.trim(),
        description: achievementDescription.trim(),
        icon_name: achievementIcon.trim(),
        is_active: true,
      });
      setAchievementCode("");
      setAchievementTitle("");
      setAchievementDescription("");
      setAchievementIcon("trophy");
      setPageMessage("Achievement created.");
      await loadData();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to create achievement");
    }
  }

  function onPrepareAchievementEdit(item: Record<string, unknown>) {
    const rawMetric = String(item.target_metric ?? "");
    setAchievementEditId(String(item.id ?? ""));
    setAchievementEditCode(String(item.code ?? ""));
    setAchievementEditTitle(String(item.title ?? ""));
    setAchievementEditDescription(String(item.description ?? ""));
    setAchievementEditIcon(String(item.icon_name ?? "trophy"));
    setAchievementEditTargetMetric(
      ACHIEVEMENT_TARGET_METRICS.includes(rawMetric as AchievementTargetMetric)
        ? (rawMetric as AchievementTargetMetric)
        : ""
    );
    setAchievementEditTargetValue(String(item.target_value ?? ""));
    setAchievementEditIsActive(asBoolean(item.is_active, true));
    setAchievementEditModalOpen(true);
  }

  async function onUpdateAchievement() {
    if (!accessToken || !achievementEditId.trim()) return;
    if (!achievementEditCode.trim() || !achievementEditTitle.trim() || !achievementEditDescription.trim()) {
      setPageError("Code, title, dan description achievement wajib diisi.");
      return;
    }

    clearFeedback();
    setAchievementEditModalSaving(true);
    try {
      await updateAchievementAdmin(accessToken, achievementEditId.trim(), {
        code: achievementEditCode.trim(),
        title: achievementEditTitle.trim(),
        description: achievementEditDescription.trim(),
        icon_name: achievementEditIcon.trim(),
        target_metric: achievementEditTargetMetric || undefined,
        target_value: achievementEditTargetValue.trim() ? Math.max(1, Math.floor(asNumber(achievementEditTargetValue, 1))) : undefined,
        is_active: achievementEditIsActive,
      });
      setPageMessage(`Achievement ${achievementEditId.trim()} updated.`);
      setAchievementEditModalOpen(false);
      await loadData();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to update achievement");
    } finally {
      setAchievementEditModalSaving(false);
    }
  }

  async function onArchiveAchievement(id: string) {
    if (!accessToken || !id.trim()) return;

    clearFeedback();
    try {
      await archiveAchievementAdmin(accessToken, id);
      setPageMessage(`Achievement ${id} archived.`);
      await loadData();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to archive achievement");
    }
  }

  if (!hasAdminAccess) {
    return <EmptyState icon={<Flag size={28} />} title="Admin only" description="Halaman challenges untuk admin/superadmin." />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Challenges Admin</CardTitle>
          <CardDescription>Kelola challenge dan achievement badge system.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-end">
            <Button type="button" variant="outline" leftIcon={<RefreshCw size={16} />} onClick={() => void loadData()} isLoading={loading}>
              Refresh
            </Button>
          </div>
          {pageError ? <Alert variant="error">{pageError}</Alert> : null}
          {pageMessage ? <Alert variant="success">{pageMessage}</Alert> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create Challenge</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 gap-3 md:grid-cols-4" onSubmit={onCreateChallenge}>
            <Input label="Title" value={challengeTitle} onChange={(e) => setChallengeTitle(e.target.value)} required />
            <Input label="Difficulty" value={challengeDifficulty} onChange={(e) => setChallengeDifficulty(e.target.value)} required />
            <Input
              label="Reward Points"
              type="number"
              min="0"
              value={challengeRewardPoints}
              onChange={(e) => setChallengeRewardPoints(e.target.value)}
              required
            />
            <div className="flex items-end">
              <Button type="submit">Create Challenge</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Challenges List</CardTitle>
        </CardHeader>
        <CardContent>
          {challenges.length === 0 && !loading ? (
            <EmptyState title="No challenges" description="Belum ada challenge." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <TableHead>ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Reward Points</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </tr>
              </thead>
              <tbody>
                {challenges.map((item, index) => (
                  <TableRow key={`challenge-${index}`}>
                    <TableCell>{String(item.id ?? "-")}</TableCell>
                    <TableCell>{String(item.title ?? "-")}</TableCell>
                    <TableCell>{String(item.difficulty ?? "-")}</TableCell>
                    <TableCell>{String(item.reward_points ?? "0")}</TableCell>
                    <TableCell>
                      <Badge variant={Boolean(item.is_active) ? "success" : "danger"}>{String(item.is_active ? "active" : "inactive")}</Badge>
                    </TableCell>
                    <TableCell>{formatDateTime((item.updated_at as string) ?? null)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => onPrepareChallengeEdit(item)}>
                          Edit
                        </Button>
                        <Button type="button" size="sm" variant="danger" onClick={() => void onArchiveChallenge(String(item.id ?? ""))}>
                          Archive
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create Achievement</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 gap-3 md:grid-cols-4" onSubmit={onCreateAchievement}>
            <Input label="Code" value={achievementCode} onChange={(e) => setAchievementCode(e.target.value)} required />
            <Input label="Title" value={achievementTitle} onChange={(e) => setAchievementTitle(e.target.value)} required />
            <Input label="Description" value={achievementDescription} onChange={(e) => setAchievementDescription(e.target.value)} required />
            <Input label="Icon Name" value={achievementIcon} onChange={(e) => setAchievementIcon(e.target.value)} required />
            <div className="md:col-span-4">
              <Button type="submit">Create Achievement</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Achievements List</CardTitle>
        </CardHeader>
        <CardContent>
          {achievements.length === 0 ? (
            <EmptyState title="No achievements" description="Belum ada achievement." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <TableHead>ID</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Metric</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </tr>
              </thead>
              <tbody>
                {achievements.map((item, index) => (
                  <TableRow key={`achievement-${index}`}>
                    <TableCell>{String(item.id ?? "-")}</TableCell>
                    <TableCell>{String(item.code ?? "-")}</TableCell>
                    <TableCell>{String(item.title ?? "-")}</TableCell>
                    <TableCell>{String(item.target_metric ?? "-")}</TableCell>
                    <TableCell>
                      <Badge variant={Boolean(item.is_active) ? "success" : "danger"}>{String(item.is_active ? "active" : "inactive")}</Badge>
                    </TableCell>
                    <TableCell>{formatDateTime((item.updated_at as string) ?? null)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => onPrepareAchievementEdit(item)}>
                          Edit
                        </Button>
                        <Button type="button" size="sm" variant="danger" onClick={() => void onArchiveAchievement(String(item.id ?? ""))}>
                          Archive
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      {challengeEditModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !challengeEditModalSaving) {
              setChallengeEditModalOpen(false);
            }
          }}
        >
          <Card className="w-full max-w-3xl max-h-[92vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="challenge-edit-modal-title">
            <CardHeader>
              <CardTitle id="challenge-edit-modal-title">Edit Challenge</CardTitle>
              <CardDescription>ID: {challengeEditId}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input label="Title" value={challengeEditTitle} onChange={(e) => setChallengeEditTitle(e.target.value)} required />
              <Input label="Difficulty" value={challengeEditDifficulty} onChange={(e) => setChallengeEditDifficulty(e.target.value)} required />
              <Input
                label="Reward Points"
                type="number"
                min="0"
                value={challengeEditRewardPoints}
                onChange={(e) => setChallengeEditRewardPoints(e.target.value)}
                required
              />
              <label className="flex items-center gap-2 pt-7 text-sm text-slate-700">
                <input type="checkbox" checked={challengeEditIsActive} onChange={(e) => setChallengeEditIsActive(e.target.checked)} />
                Active
              </label>
              <Input
                label="Description (Optional)"
                className="md:col-span-2"
                value={challengeEditDescription}
                onChange={(e) => setChallengeEditDescription(e.target.value)}
              />
              <div className="flex justify-end gap-2 md:col-span-2">
                <Button type="button" variant="ghost" onClick={() => setChallengeEditModalOpen(false)} disabled={challengeEditModalSaving}>
                  Close
                </Button>
                <Button type="button" variant="secondary" onClick={() => void onUpdateChallenge()} isLoading={challengeEditModalSaving}>
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {achievementEditModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !achievementEditModalSaving) {
              setAchievementEditModalOpen(false);
            }
          }}
        >
          <Card className="w-full max-w-3xl max-h-[92vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="achievement-edit-modal-title">
            <CardHeader>
              <CardTitle id="achievement-edit-modal-title">Edit Achievement</CardTitle>
              <CardDescription>ID: {achievementEditId}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input label="Code" value={achievementEditCode} onChange={(e) => setAchievementEditCode(e.target.value)} required />
              <Input label="Title" value={achievementEditTitle} onChange={(e) => setAchievementEditTitle(e.target.value)} required />
              <Input label="Icon Name" value={achievementEditIcon} onChange={(e) => setAchievementEditIcon(e.target.value)} required />
              <label className="flex items-center gap-2 pt-7 text-sm text-slate-700">
                <input type="checkbox" checked={achievementEditIsActive} onChange={(e) => setAchievementEditIsActive(e.target.checked)} />
                Active
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Target Metric (Optional)</span>
                <select
                  className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm"
                  value={achievementEditTargetMetric}
                  onChange={(e) => setAchievementEditTargetMetric(e.target.value as "" | AchievementTargetMetric)}
                >
                  <option value="">none</option>
                  {ACHIEVEMENT_TARGET_METRICS.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                label="Target Value (Optional)"
                type="number"
                min="1"
                value={achievementEditTargetValue}
                onChange={(e) => setAchievementEditTargetValue(e.target.value)}
              />
              <Input
                label="Description"
                className="md:col-span-2"
                value={achievementEditDescription}
                onChange={(e) => setAchievementEditDescription(e.target.value)}
                required
              />
              <div className="flex justify-end gap-2 md:col-span-2">
                <Button type="button" variant="ghost" onClick={() => setAchievementEditModalOpen(false)} disabled={achievementEditModalSaving}>
                  Close
                </Button>
                <Button type="button" variant="secondary" onClick={() => void onUpdateAchievement()} isLoading={achievementEditModalSaving}>
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
