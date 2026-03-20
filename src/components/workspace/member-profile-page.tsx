"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";

import { createId, getTodayKey, type DirectMessage, type FamilyAchievement, type FitnessLog, type MemberProfile, type ProfileUpload } from "@/lib/familyflow";
import type { HouseholdMember, HouseholdRole } from "@/lib/workspace";
import { DisclosurePanel } from "@/components/workspace/disclosure-panel";
import { EditableMessageThread } from "@/components/workspace/editable-message-thread";

type WeatherSnapshot = {
  location: { label: string };
  weather: {
    summary: string;
    temperatureF: number | null;
    feelsLikeF: number | null;
    windMph: number | null;
    highF: number | null;
    lowF: number | null;
  };
};

type Props = {
  member: HouseholdMember;
  profile: MemberProfile;
  role: HouseholdRole;
  currentUserId: string;
  familyAchievements: FamilyAchievement[];
  directMessages: DirectMessage[];
  onBackToFamilyRoom: () => void;
  onSendMessage: (content: string) => void;
  onEditMessage: (messageId: string, content: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onSaveBasics: (headline: string, about: string) => void;
  onSaveWeatherLocation: (location: string) => void;
  onSaveFitness: (entry: FitnessLog) => void;
  onShareFitness: () => void;
  onAddGoal: (goal: { title: string; detail: string; category: string; targetDate: string; points: number }) => void;
  onCompleteGoal: (goalId: string) => void;
  onShareGoal: (goalId: string) => void;
  onAddReward: (reward: { title: string; detail: string; cost: number }) => void;
  onRedeemReward: (rewardId: string) => void;
  onAddCalendarEvent: (event: { title: string; date: string; time: string; detail: string }) => void;
  onSaveAvatarUpload: (upload: ProfileUpload) => void;
  onAddMemoryUpload: (upload: ProfileUpload) => void;
  onRemoveUpload: (uploadId: string) => void;
};

const MAX_UPLOAD_BYTES = 1_500_000;

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "FF"
  );
}

function formatDateLabel(value: string) {
  if (!value) {
    return "Any day";
  }

  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(parsed);
}

function buildCalendar(dateKey: string, eventDates: string[]) {
  const today = new Date(`${dateKey}T12:00:00`);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());
  const eventSet = new Set(eventDates);

  return Array.from({ length: 35 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return {
      key,
      label: date.getDate(),
      inMonth: date.getMonth() === today.getMonth(),
      isToday: key === dateKey,
      hasEvent: eventSet.has(key),
    };
  });
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("That file could not be read."));
    };
    reader.onerror = () => reject(new Error("That file could not be read."));
    reader.readAsDataURL(file);
  });
}

export function MemberProfilePage({
  member,
  profile,
  role,
  currentUserId,
  familyAchievements,
  directMessages,
  onBackToFamilyRoom,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onSaveBasics,
  onSaveWeatherLocation,
  onSaveFitness,
  onShareFitness,
  onAddGoal,
  onCompleteGoal,
  onShareGoal,
  onAddReward,
  onRedeemReward,
  onAddCalendarEvent,
  onSaveAvatarUpload,
  onAddMemoryUpload,
  onRemoveUpload,
}: Props) {
  const todayKey = getTodayKey();
  const todayFitness = profile.fitnessLogs.find((entry) => entry.date === todayKey);
  const avatar = profile.uploads.find((upload) => upload.id === profile.avatarUploadId) ?? null;
  const canEdit = currentUserId === member.id || role === "owner" || role === "admin";
  const canMessageMember = currentUserId !== member.id;
  const familyFeed = familyAchievements.filter((item) => item.memberId === member.id).slice(0, 5);
  const calendar = useMemo(() => buildCalendar(todayKey, profile.calendarEvents.map((event) => event.date)), [profile.calendarEvents, todayKey]);

  const [headline, setHeadline] = useState(profile.headline);
  const [about, setAbout] = useState(profile.about);
  const [weatherLocation, setWeatherLocation] = useState(profile.weatherLocation);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [steps, setSteps] = useState(String(todayFitness?.steps ?? 0));
  const [minutes, setMinutes] = useState(String(todayFitness?.movementMinutes ?? 0));
  const [water, setWater] = useState(String(todayFitness?.waterCups ?? 0));
  const [sleep, setSleep] = useState(String(todayFitness?.sleepHours ?? 0));
  const [fitnessNote, setFitnessNote] = useState(todayFitness?.note ?? "");
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDetail, setGoalDetail] = useState("");
  const [goalCategory, setGoalCategory] = useState("Personal best");
  const [goalDate, setGoalDate] = useState(todayKey);
  const [goalPoints, setGoalPoints] = useState("15");
  const [rewardTitle, setRewardTitle] = useState("");
  const [rewardDetail, setRewardDetail] = useState("");
  const [rewardCost, setRewardCost] = useState("25");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState(todayKey);
  const [eventTime, setEventTime] = useState("");
  const [eventDetail, setEventDetail] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadNote, setUploadNote] = useState("");
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const displayedWeather = profile.weatherLocation ? weather : null;
  const displayedWeatherError = profile.weatherLocation ? weatherError : null;

  useEffect(() => {
    if (!profile.weatherLocation) {
      return;
    }

    const controller = new AbortController();
    void (async () => {
      setWeatherLoading(true);
      setWeatherError(null);

      try {
        const response = await fetch(`/api/weather?location=${encodeURIComponent(profile.weatherLocation)}`, {
          signal: controller.signal,
        });
        const body = (await response.json()) as WeatherSnapshot & { error?: string };
        if (!response.ok) {
          throw new Error(body.error ?? "Weather is not available right now.");
        }

        setWeather(body);
      } catch (error: unknown) {
        if ((error as { name?: string }).name === "AbortError") {
          return;
        }

        setWeather(null);
        setWeatherError(error instanceof Error ? error.message : "Weather is not available right now.");
      } finally {
        if (!controller.signal.aborted) {
          setWeatherLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [profile.weatherLocation]);

  async function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadStatus("Profile pictures need to stay under 1.5 MB.");
      return;
    }

    const dataUrl = await fileToDataUrl(file);
    onSaveAvatarUpload({
      id: createId("upload"),
      kind: "avatar",
      title: `${member.name} picture`,
      note: "Profile picture",
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      dataUrl,
      createdAt: new Date().toISOString(),
    });
    setUploadStatus("Profile picture saved.");
  }

  async function handleMemoryUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadStatus("Uploads need to stay under 1.5 MB.");
      return;
    }

    const dataUrl = await fileToDataUrl(file);
    onAddMemoryUpload({
      id: createId("upload"),
      kind: "memory",
      title: uploadTitle.trim() || file.name,
      note: uploadNote.trim(),
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      dataUrl,
      createdAt: new Date().toISOString(),
    });
    setUploadTitle("");
    setUploadNote("");
    setUploadStatus("Keepsake added.");
  }

  function saveBasics(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSaveBasics(headline.trim() || `${member.name}`, about.trim());
  }

  function saveFitness(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSaveFitness({
      date: todayKey,
      steps: Number(steps) || 0,
      movementMinutes: Number(minutes) || 0,
      waterCups: Number(water) || 0,
      sleepHours: Number(sleep) || 0,
      note: fitnessNote.trim(),
    });
  }

  return (
    <div className="space-y-5">
      <article className="family-profile-hero family-animate-rise rounded-[34px] p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <button type="button" onClick={onBackToFamilyRoom} className="family-btn family-btn-soft">
            Back to Family Room
          </button>
          <span className={`family-badge ${member.role === "owner" ? "family-badge-warm" : member.role === "admin" ? "family-badge-accent" : "family-badge-gold"}`}>{member.role}</span>
        </div>
        <div className="mt-6 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="family-profile-hero__identity">
            <div className="family-profile-avatar">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar.dataUrl} alt={`${member.name} profile`} className="family-profile-avatar__image" />
              ) : (
                <span>{getInitials(member.name)}</span>
              )}
            </div>
            <div>
              <p className="family-kicker family-eyebrow">Profile</p>
              <h1 className="mt-3 font-serif text-5xl leading-[0.95]">{member.name}</h1>
              <p className="mt-4 text-lg leading-8 text-[var(--muted)]">{profile.headline}</p>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{profile.about || "Goals, points, calendar, and uploads."}</p>
            </div>
          </div>
          <div className="family-profile-stat-grid">
            <div className="family-side-stat">
              <p className="family-kicker text-[rgba(241,214,136,0.76)]">Points</p>
              <p className="mt-3 font-serif text-5xl text-white">{profile.pointsBalance}</p>
            </div>
            <div className="family-sidebar-note">
              <p className="family-kicker family-eyebrow">Goals</p>
              <p className="mt-3 font-serif text-4xl">{profile.goals.filter((goal) => goal.status === "done").length}</p>
            </div>
            <div className="family-sidebar-note">
              <p className="family-kicker family-eyebrow">All-time points</p>
              <p className="mt-3 font-serif text-4xl">{profile.lifetimePoints}</p>
            </div>
            <div className="family-sidebar-note">
              <p className="family-kicker family-eyebrow">Events</p>
              <p className="mt-3 font-serif text-4xl">{profile.calendarEvents.length}</p>
            </div>
          </div>
        </div>
      </article>

      <div className="grid gap-5 2xl:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-5">
          <DisclosurePanel
            kicker="Profile"
            title="About"
            summary="Edit the profile text."
            badge={canEdit ? "Editable" : "View only"}
            className="family-panel rounded-[28px] p-5 md:p-6"
          >
            <form className="grid gap-4" onSubmit={saveBasics}>
              <label className="block text-sm font-medium text-stone-700">
                Headline
                <input value={headline} onChange={(event) => setHeadline(event.target.value)} disabled={!canEdit} className="family-input mt-2" />
              </label>
              <label className="block text-sm font-medium text-stone-700">
                About
                <textarea value={about} onChange={(event) => setAbout(event.target.value)} disabled={!canEdit} rows={4} className="family-textarea mt-2" />
              </label>
              <button type="submit" disabled={!canEdit} className="family-btn family-btn-primary">
                Save profile
              </button>
            </form>
          </DisclosurePanel>

          <DisclosurePanel
            kicker="Goals"
            title="Goals"
            summary="Track goals here."
            badge={`${profile.goals.filter((goal) => goal.status === "active").length} active`}
            defaultOpen
            className="family-panel rounded-[28px] p-5 md:p-6"
          >
            {canEdit ? (
              <form
                className="family-profile-form-grid"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!goalTitle.trim()) return;
                  onAddGoal({ title: goalTitle.trim(), detail: goalDetail.trim(), category: goalCategory.trim(), targetDate: goalDate, points: Number(goalPoints) || 10 });
                  setGoalTitle("");
                  setGoalDetail("");
                  setGoalCategory("Personal best");
                  setGoalDate(todayKey);
                  setGoalPoints("15");
                }}
              >
                <input value={goalTitle} onChange={(event) => setGoalTitle(event.target.value)} placeholder="Goal" className="family-input" />
                <input value={goalCategory} onChange={(event) => setGoalCategory(event.target.value)} placeholder="Category" className="family-input" />
                <input type="number" min="1" value={goalPoints} onChange={(event) => setGoalPoints(event.target.value)} placeholder="Points" className="family-input" />
                <input type="date" value={goalDate} onChange={(event) => setGoalDate(event.target.value)} className="family-input" />
                <textarea value={goalDetail} onChange={(event) => setGoalDetail(event.target.value)} rows={3} placeholder="Details" className="family-textarea family-profile-form-grid__wide" />
                <button type="submit" className="family-btn family-btn-primary family-profile-form-grid__wide">Add goal</button>
              </form>
            ) : null}
            <div className="mt-5 grid gap-3">
              {profile.goals.length > 0 ? (
                profile.goals.map((goal) => (
                  <div key={goal.id} className={`family-profile-goal-card ${goal.status === "done" ? "family-profile-goal-card-done" : ""}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="family-kicker family-eyebrow">{goal.category}</p>
                        <h3 className="mt-2 font-serif text-2xl">{goal.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{goal.detail || "No details yet."}</p>
                      </div>
                      <span className={`family-badge ${goal.status === "done" ? "family-badge-accent" : "family-badge-gold"}`}>{goal.status === "done" ? "Done" : `${goal.points} pts`}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <span className="text-sm text-[var(--muted)]">{formatDateLabel(goal.targetDate)}</span>
                      {goal.status === "active" && canEdit ? <button type="button" onClick={() => onCompleteGoal(goal.id)} className="family-btn family-btn-primary">Mark finished</button> : null}
                      {goal.status === "done" && canEdit && !goal.sharedAt ? <button type="button" onClick={() => onShareGoal(goal.id)} className="family-btn family-btn-secondary">Share with family</button> : null}
                      {goal.sharedAt ? <span className="family-badge family-badge-warm">Shared</span> : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="family-empty rounded-[24px] p-5 text-sm leading-7 text-[var(--muted)]">No goals yet.</div>
              )}
            </div>
          </DisclosurePanel>

          <DisclosurePanel
            kicker="Calendar"
            title="Calendar"
            summary="Events and schedule."
            badge={`${profile.calendarEvents.length} events`}
            className="family-panel rounded-[28px] p-5 md:p-6"
          >
            {canEdit ? (
              <form
                className="family-profile-form-grid"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!eventTitle.trim()) return;
                  onAddCalendarEvent({ title: eventTitle.trim(), date: eventDate, time: eventTime.trim(), detail: eventDetail.trim() });
                  setEventTitle("");
                  setEventDate(todayKey);
                  setEventTime("");
                  setEventDetail("");
                }}
              >
                <input value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} placeholder="Event" className="family-input" />
                <input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} className="family-input" />
                <input type="time" value={eventTime} onChange={(event) => setEventTime(event.target.value)} className="family-input" />
                <input value={eventDetail} onChange={(event) => setEventDetail(event.target.value)} placeholder="Details" className="family-input family-profile-form-grid__wide" />
                <button type="submit" className="family-btn family-btn-primary family-profile-form-grid__wide">Add event</button>
              </form>
            ) : null}
            <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.95fr]">
              <div className="family-profile-calendar-grid">
                {calendar.map((day) => (
                  <div key={day.key} className={`family-profile-calendar-cell ${day.inMonth ? "" : "family-profile-calendar-cell-muted"} ${day.isToday ? "family-profile-calendar-cell-today" : ""}`}>
                    <span>{day.label}</span>
                    {day.hasEvent ? <span className="family-profile-calendar-dot" /> : null}
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {profile.calendarEvents.length > 0 ? (
                  profile.calendarEvents.slice(0, 5).map((event) => (
                    <div key={event.id} className="family-profile-feed-card">
                      <p className="family-kicker family-eyebrow">{formatDateLabel(event.date)}</p>
                      <h3 className="mt-2 font-serif text-2xl">{event.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{event.time ? `${event.time} / ` : ""}{event.detail || "No details yet."}</p>
                    </div>
                  ))
                ) : (
                  <div className="family-empty rounded-[24px] p-5 text-sm leading-7 text-[var(--muted)]">No events yet.</div>
                )}
              </div>
            </div>
          </DisclosurePanel>
        </div>

        <div className="space-y-5">
          {canMessageMember ? (
            <article className="family-panel rounded-[28px] p-6">
              <p className="family-kicker family-eyebrow">Chat</p>
              <h2 className="mt-3 font-serif text-4xl leading-tight">Message {member.name}</h2>
              <div className="mt-5">
                <EditableMessageThread
                  messages={directMessages}
                  currentUserId={currentUserId}
                  emptyMessage="No messages yet."
                  composePlaceholder={`Message ${member.name}...`}
                  sendLabel="Send message"
                  onSendMessage={onSendMessage}
                  onEditMessage={onEditMessage}
                  onDeleteMessage={onDeleteMessage}
                />
              </div>
            </article>
          ) : null}

          <DisclosurePanel
            kicker="Weather"
            title={displayedWeather?.weather.summary ?? "Weather"}
            summary={displayedWeather?.location.label ?? "Set a city."}
            badge={profile.weatherLocation ? "Saved" : "No city"}
            className="family-panel rounded-[28px] p-5 md:p-6"
          >
            <form
              className="mt-5 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                onSaveWeatherLocation(weatherLocation.trim());
              }}
            >
              <input value={weatherLocation} onChange={(event) => setWeatherLocation(event.target.value)} disabled={!canEdit} placeholder="Indianapolis, IN" className="family-input" />
              <button type="submit" disabled={!canEdit} className="family-btn family-btn-primary">Save location</button>
            </form>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="family-sidebar-note"><p className="family-kicker family-eyebrow">Temp</p><p className="mt-3 font-serif text-3xl">{displayedWeather?.weather.temperatureF != null ? `${Math.round(displayedWeather.weather.temperatureF)}°` : "--"}</p></div>
              <div className="family-sidebar-note"><p className="family-kicker family-eyebrow">Feels like</p><p className="mt-3 font-serif text-3xl">{displayedWeather?.weather.feelsLikeF != null ? `${Math.round(displayedWeather.weather.feelsLikeF)}°` : "--"}</p></div>
              <div className="family-sidebar-note"><p className="family-kicker family-eyebrow">High / low</p><p className="mt-3 font-serif text-3xl">{displayedWeather?.weather.highF != null && displayedWeather?.weather.lowF != null ? `${Math.round(displayedWeather.weather.highF)}° / ${Math.round(displayedWeather.weather.lowF)}°` : "--"}</p></div>
              <div className="family-sidebar-note"><p className="family-kicker family-eyebrow">Status</p><p className="mt-3 text-sm leading-7 text-[var(--muted)]">{weatherLoading ? "Checking weather..." : displayedWeatherError ?? (displayedWeather?.weather.windMph != null ? `${Math.round(displayedWeather.weather.windMph)} mph wind` : "Weather is ready when a location is saved.")}</p></div>
            </div>
          </DisclosurePanel>

          <DisclosurePanel
            kicker="Fitness"
            title="Today's tracker"
            summary="Steps, water, sleep, and movement."
            badge={todayFitness ? "Saved today" : "Not saved"}
            className="family-panel rounded-[28px] p-5 md:p-6"
          >
            <form className="family-profile-form-grid mt-5" onSubmit={saveFitness}>
              <input type="number" min="0" value={steps} onChange={(event) => setSteps(event.target.value)} disabled={!canEdit} placeholder="Steps" className="family-input" />
              <input type="number" min="0" value={minutes} onChange={(event) => setMinutes(event.target.value)} disabled={!canEdit} placeholder="Active minutes" className="family-input" />
              <input type="number" min="0" value={water} onChange={(event) => setWater(event.target.value)} disabled={!canEdit} placeholder="Water cups" className="family-input" />
              <input type="number" min="0" step="0.5" value={sleep} onChange={(event) => setSleep(event.target.value)} disabled={!canEdit} placeholder="Sleep hours" className="family-input" />
              <textarea value={fitnessNote} onChange={(event) => setFitnessNote(event.target.value)} disabled={!canEdit} rows={3} placeholder="How did today go?" className="family-textarea family-profile-form-grid__wide" />
              <div className="family-profile-form-grid__wide flex flex-wrap gap-3">
                <button type="submit" disabled={!canEdit} className="family-btn family-btn-primary">Save today&apos;s tracker</button>
                {todayFitness ? <button type="button" onClick={onShareFitness} disabled={!canEdit} className="family-btn family-btn-secondary">Share fitness win</button> : null}
              </div>
            </form>
          </DisclosurePanel>

          <DisclosurePanel
            kicker="Rewards"
            title="Rewards"
            summary="Spend points here."
            badge={`${profile.rewards.length} saved`}
            className="family-panel rounded-[28px] p-5 md:p-6"
          >
            {canEdit ? (
              <form
                className="family-profile-form-grid mt-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!rewardTitle.trim()) return;
                  onAddReward({ title: rewardTitle.trim(), detail: rewardDetail.trim(), cost: Number(rewardCost) || 25 });
                  setRewardTitle("");
                  setRewardDetail("");
                  setRewardCost("25");
                }}
              >
                <input value={rewardTitle} onChange={(event) => setRewardTitle(event.target.value)} placeholder="Reward" className="family-input" />
                <input type="number" min="1" value={rewardCost} onChange={(event) => setRewardCost(event.target.value)} placeholder="Cost" className="family-input" />
                <input value={rewardDetail} onChange={(event) => setRewardDetail(event.target.value)} placeholder="Details" className="family-input family-profile-form-grid__wide" />
                <button type="submit" className="family-btn family-btn-primary family-profile-form-grid__wide">Add reward</button>
              </form>
            ) : null}
            <div className="mt-5 grid gap-3">
              {profile.rewards.length > 0 ? (
                profile.rewards.map((reward) => (
                  <div key={reward.id} className="family-profile-reward-card">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="family-kicker family-eyebrow">{reward.cost} points</p>
                        <h3 className="mt-2 font-serif text-2xl">{reward.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{reward.detail || "No details yet."}</p>
                      </div>
                      <button type="button" onClick={() => onRedeemReward(reward.id)} disabled={!canEdit || profile.pointsBalance < reward.cost} className="family-btn family-btn-secondary">
                        {profile.pointsBalance >= reward.cost ? "Redeem" : "Need points"}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="family-empty rounded-[24px] p-5 text-sm leading-7 text-[var(--muted)]">No rewards yet.</div>
              )}
            </div>
          </DisclosurePanel>

          <DisclosurePanel
            kicker="Uploads"
            title="Photos and keepsakes"
            summary="Pictures and saved items."
            badge={`${profile.uploads.length} saved`}
            className="family-panel rounded-[28px] p-5 md:p-6"
          >
            {canEdit ? (
              <div className="mt-5 grid gap-4">
                <input type="file" accept="image/*" onChange={(event) => void handleAvatarUpload(event)} className="family-input cursor-pointer file:mr-4 file:rounded-full file:border-0 file:bg-black file:px-4 file:py-2 file:text-white" />
                <input value={uploadTitle} onChange={(event) => setUploadTitle(event.target.value)} placeholder="Keepsake title" className="family-input" />
                <input value={uploadNote} onChange={(event) => setUploadNote(event.target.value)} placeholder="Keepsake note" className="family-input" />
                <input type="file" onChange={(event) => void handleMemoryUpload(event)} className="family-input cursor-pointer file:mr-4 file:rounded-full file:border-0 file:bg-[var(--accent-gold)] file:px-4 file:py-2 file:text-black" />
              </div>
            ) : null}
            {uploadStatus ? <p className="mt-3 text-sm leading-7 text-[var(--accent-strong)]">{uploadStatus}</p> : null}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {profile.uploads.length > 0 ? (
                profile.uploads.map((upload) => (
                  <div key={upload.id} className="family-profile-upload-card">
                    {upload.mimeType.startsWith("image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={upload.dataUrl} alt={upload.title} className="family-profile-upload-card__image" />
                    ) : (
                      <div className="family-profile-upload-card__file">{upload.fileName}</div>
                    )}
                    <p className="mt-4 font-semibold text-stone-900">{upload.title}</p>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{upload.note || upload.fileName}</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <a href={upload.dataUrl} download={upload.fileName} className="family-btn family-btn-soft">Open item</a>
                      {canEdit ? <button type="button" onClick={() => onRemoveUpload(upload.id)} className="family-btn family-btn-secondary">Remove</button> : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="family-empty rounded-[24px] p-5 text-sm leading-7 text-[var(--muted)] sm:col-span-2">No uploads yet.</div>
              )}
            </div>
          </DisclosurePanel>

          <DisclosurePanel
            kicker="Shared wins"
            title="Shared wins"
            summary="Things shared with the family."
            badge={`${familyFeed.length} shown`}
            className="family-panel rounded-[28px] p-5 md:p-6"
          >
            <div className="mt-5 space-y-3">
              {familyFeed.length > 0 ? (
                familyFeed.map((item) => (
                  <div key={item.id} className="family-profile-feed-card">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="family-kicker family-eyebrow">{formatDateLabel(item.createdAt.slice(0, 10))}</p>
                        <h3 className="mt-2 font-serif text-2xl">{item.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{item.detail || "A family win just landed."}</p>
                      </div>
                      {item.points > 0 ? <span className="family-badge family-badge-gold">+{item.points}</span> : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="family-empty rounded-[24px] p-5 text-sm leading-7 text-[var(--muted)]">No shared wins yet.</div>
              )}
            </div>
          </DisclosurePanel>
        </div>
      </div>
    </div>
  );
}
