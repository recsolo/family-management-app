"use client";

import { useMemo, useState, type FormEvent } from "react";

import { DisclosurePanel } from "@/components/workspace/disclosure-panel";
import type { AppState, PartnerRewardCategory } from "@/lib/familyflow";
import type { HouseholdMember } from "@/lib/workspace";
import { EditableMessageThread } from "@/components/workspace/editable-message-thread";

type PartnerTab = "chat" | "date-night" | "private-rewards" | "milestones" | "closer";
type PartnerSpaceState = NonNullable<AppState["partnerSpace"]>;
type PartnerDatePlan = PartnerSpaceState["datePlans"][number];
type PartnerConnectionNote = PartnerSpaceState["connectionNotes"][number];
type PartnerReward = PartnerSpaceState["privateRewards"][number];
type PartnerAnniversary = PartnerSpaceState["anniversaries"][number];
type PartnerBucketListItem = PartnerSpaceState["bucketList"][number];
type PartnerRewardInput = {
  title: string;
  detail: string;
  cost: number;
  category: PartnerRewardCategory;
  favorite: boolean;
};
type RewardFilter = "all" | "favorites" | PartnerRewardCategory;

type Props = {
  currentUserId: string;
  canConfigurePartnerSpace: boolean;
  currentUserIsPartner: boolean;
  members: HouseholdMember[];
  memberProfiles: AppState["memberProfiles"];
  partnerMembers: HouseholdMember[];
  partnerSpace: AppState["partnerSpace"];
  onConfigurePartnerSpace: (memberIds: string[]) => void;
  onSendMessage: (content: string) => void;
  onEditMessage: (messageId: string, content: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onAddPrivateReward: (reward: PartnerRewardInput) => void;
  onUpdatePrivateReward: (rewardId: string, reward: PartnerRewardInput) => void;
  onDeletePrivateReward: (rewardId: string) => void;
  onRedeemPrivateReward: (rewardId: string) => void;
  onAddDatePlan: (plan: {
    title: string;
    when: string;
    location: string;
    detail: string;
    budget: string;
    status: "idea" | "planned" | "booked";
  }) => void;
  onUpdateDatePlan: (
    planId: string,
    plan: {
      title: string;
      when: string;
      location: string;
      detail: string;
      budget: string;
      status: "idea" | "planned" | "booked";
    },
  ) => void;
  onDeleteDatePlan: (planId: string) => void;
  onAddConnectionNote: (note: { title: string; content: string }) => void;
  onUpdateConnectionNote: (noteId: string, note: { title: string; content: string }) => void;
  onDeleteConnectionNote: (noteId: string) => void;
  onAddAnniversary: (entry: { title: string; date: string; detail: string; memory: string }) => void;
  onUpdateAnniversary: (anniversaryId: string, entry: { title: string; date: string; detail: string; memory: string }) => void;
  onDeleteAnniversary: (anniversaryId: string) => void;
  onAddBucketListItem: (entry: {
    title: string;
    detail: string;
    targetWhen: string;
    memory: string;
    status: "idea" | "planned" | "done";
  }) => void;
  onUpdateBucketListItem: (
    itemId: string,
    entry: {
      title: string;
      detail: string;
      targetWhen: string;
      memory: string;
      status: "idea" | "planned" | "done";
    },
  ) => void;
  onDeleteBucketListItem: (itemId: string) => void;
};

function formatTimestamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function formatPartnerLabel(members: HouseholdMember[]) {
  if (members.length === 2) {
    return `${members[0]?.name} + ${members[1]?.name}`;
  }

  return "Partner Space";
}

function formatDateValue(value: string) {
  if (!value) {
    return "Pick a time";
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(parsed);
  }

  return value;
}

function getUniqueConnectionDays(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.slice(0, 10))
        .filter(Boolean),
    ),
  ).sort((left, right) => right.localeCompare(left));
}

function getConnectionStreak(values: string[]) {
  const days = getUniqueConnectionDays(values);
  if (days.length === 0) {
    return 0;
  }

  let streak = 1;
  for (let index = 1; index < days.length; index += 1) {
    const previous = new Date(`${days[index - 1]}T12:00:00`);
    const next = new Date(`${days[index]}T12:00:00`);
    const diff = Math.round((previous.getTime() - next.getTime()) / (24 * 60 * 60 * 1000));
    if (diff !== 1) {
      break;
    }
    streak += 1;
  }

  return streak;
}

function getDaysUntil(dateValue: string) {
  if (!dateValue) {
    return null;
  }

  const target = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(target.getTime())) {
    return null;
  }

  const today = new Date();
  const todayAtNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0, 0);
  return Math.round((target.getTime() - todayAtNoon.getTime()) / (24 * 60 * 60 * 1000));
}

const QUICK_PARTNER_MESSAGES = [
  "Thinking about you.",
  "Want to plan something this week?",
  "Thanks for today.",
];

const DATE_VIBES = [
  {
    title: "At-home reset night",
    when: "Friday 8:00 PM",
    location: "At home",
    budget: "$20",
    detail: "Phones away, favorite takeout, one movie, and zero chores.",
    status: "planned" as const,
  },
  {
    title: "Coffee and walk",
    when: "Saturday 10:00 AM",
    location: "Neighborhood trail",
    budget: "$15",
    detail: "Quick coffee stop, long walk, and one question you never make time to ask.",
    status: "idea" as const,
  },
  {
    title: "Mini dressed-up date",
    when: "Next Thursday 7:30 PM",
    location: "Favorite local spot",
    budget: "$60",
    detail: "Dress up a little, split dessert, and make it feel like an occasion.",
    status: "booked" as const,
  },
];

const PRIVATE_REWARD_IDEAS = [
  { title: "Massage night", detail: "One cozy, no-rush back rub and quiet time together.", cost: 40, category: "romance" as const },
  { title: "Sleep-in pass", detail: "One partner takes the morning so the other can fully rest.", cost: 55, category: "rest" as const },
  { title: "Pick the whole date", detail: "Choose the plan, the vibe, and the food with zero debate.", cost: 70, category: "adventure" as const },
];

const PARTNER_REWARD_CATEGORIES: Array<{ value: PartnerRewardCategory; label: string }> = [
  { value: "romance", label: "Romance" },
  { value: "rest", label: "Rest" },
  { value: "adventure", label: "Adventure" },
  { value: "flirty", label: "Flirty" },
];

const CLOSER_NOTE_PROMPTS = [
  "What I appreciated today",
  "A memory I still smile about",
  "Something I want us to make time for",
];

export function PartnerSpacePage({
  currentUserId,
  canConfigurePartnerSpace,
  currentUserIsPartner,
  members,
  memberProfiles,
  partnerMembers,
  partnerSpace,
  onConfigurePartnerSpace,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onAddPrivateReward,
  onUpdatePrivateReward,
  onDeletePrivateReward,
  onRedeemPrivateReward,
  onAddDatePlan,
  onUpdateDatePlan,
  onDeleteDatePlan,
  onAddConnectionNote,
  onUpdateConnectionNote,
  onDeleteConnectionNote,
  onAddAnniversary,
  onUpdateAnniversary,
  onDeleteAnniversary,
  onAddBucketListItem,
  onUpdateBucketListItem,
  onDeleteBucketListItem,
}: Props) {
  const [activeTab, setActiveTab] = useState<PartnerTab>("chat");
  const [pairA, setPairA] = useState(partnerSpace?.memberIds[0] ?? members[0]?.id ?? "");
  const [pairB, setPairB] = useState(partnerSpace?.memberIds[1] ?? members[1]?.id ?? "");
  const [rewardTitle, setRewardTitle] = useState("");
  const [rewardDetail, setRewardDetail] = useState("");
  const [rewardCost, setRewardCost] = useState("50");
  const [rewardCategory, setRewardCategory] = useState<PartnerRewardCategory>("romance");
  const [rewardFavorite, setRewardFavorite] = useState(false);
  const [rewardFilter, setRewardFilter] = useState<RewardFilter>("all");
  const [surpriseRewardId, setSurpriseRewardId] = useState<string | null>(null);
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [dateTitle, setDateTitle] = useState("");
  const [dateWhen, setDateWhen] = useState("");
  const [dateLocation, setDateLocation] = useState("");
  const [dateDetail, setDateDetail] = useState("");
  const [dateBudget, setDateBudget] = useState("");
  const [dateStatus, setDateStatus] = useState<"idea" | "planned" | "booked">("idea");
  const [editingDatePlanId, setEditingDatePlanId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [anniversaryTitle, setAnniversaryTitle] = useState("");
  const [anniversaryDate, setAnniversaryDate] = useState("");
  const [anniversaryDetail, setAnniversaryDetail] = useState("");
  const [anniversaryMemory, setAnniversaryMemory] = useState("");
  const [editingAnniversaryId, setEditingAnniversaryId] = useState<string | null>(null);
  const [bucketTitle, setBucketTitle] = useState("");
  const [bucketDetail, setBucketDetail] = useState("");
  const [bucketWhen, setBucketWhen] = useState("");
  const [bucketMemory, setBucketMemory] = useState("");
  const [bucketStatus, setBucketStatus] = useState<"idea" | "planned" | "done">("idea");
  const [editingBucketId, setEditingBucketId] = useState<string | null>(null);

  const currentProfile = memberProfiles.find((profile) => profile.memberId === currentUserId);
  const partnerPointCards = useMemo(
    () =>
      partnerMembers.map((member) => ({
        member,
        profile: memberProfiles.find((profile) => profile.memberId === member.id),
      })),
    [memberProfiles, partnerMembers],
  );
  const partnerLabel = formatPartnerLabel(partnerMembers);
  const canSeePrivateContent = currentUserIsPartner;
  const connectionStreak = useMemo(
    () => getConnectionStreak([...(partnerSpace?.messages ?? []).map((message) => message.createdAt), ...(partnerSpace?.connectionNotes ?? []).map((note) => note.createdAt)]),
    [partnerSpace],
  );
  const plannedDates = partnerSpace?.datePlans.filter((plan) => plan.status === "planned" || plan.status === "booked") ?? [];
  const nextDate = plannedDates[0] ?? partnerSpace?.datePlans[0] ?? null;
  const redeemedRewards = partnerSpace?.privateRewards.reduce((total, reward) => total + reward.redemptions, 0) ?? 0;
  const anniversaries = partnerSpace?.anniversaries ?? [];
  const bucketList = partnerSpace?.bucketList ?? [];
  const filteredRewards = useMemo(() => {
    const rewards = partnerSpace?.privateRewards ?? [];
    if (rewardFilter === "all") {
      return rewards;
    }
    if (rewardFilter === "favorites") {
      return rewards.filter((reward) => reward.favorite);
    }
    return rewards.filter((reward) => reward.category === rewardFilter);
  }, [partnerSpace?.privateRewards, rewardFilter]);
  const affordableRewards = filteredRewards.filter((reward) => (currentProfile?.pointsBalance ?? 0) >= reward.cost);
  const favoriteRewards = partnerSpace?.privateRewards.filter((reward) => reward.favorite) ?? [];
  const nextAnniversary = useMemo(
    () =>
      anniversaries
        .map((entry) => ({ entry, daysUntil: getDaysUntil(entry.date) }))
        .filter((entry): entry is { entry: PartnerAnniversary; daysUntil: number } => entry.daysUntil !== null)
        .sort((left, right) => left.daysUntil - right.daysUntil)[0] ?? null,
    [anniversaries],
  );
  const doneBucketCount = bucketList.filter((entry) => entry.status === "done").length;
  const surpriseReward = filteredRewards.find((reward) => reward.id === surpriseRewardId) ?? null;

  function savePair(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pairA || !pairB || pairA === pairB) {
      return;
    }

    onConfigurePartnerSpace([pairA, pairB]);
  }

  function submitReward(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rewardTitle.trim()) {
      return;
    }

    const nextReward = {
      title: rewardTitle.trim(),
      detail: rewardDetail.trim(),
      cost: Number(rewardCost) || 50,
      category: rewardCategory,
      favorite: rewardFavorite,
    };

    if (editingRewardId) {
      onUpdatePrivateReward(editingRewardId, nextReward);
    } else {
      onAddPrivateReward(nextReward);
    }
    setRewardTitle("");
    setRewardDetail("");
    setRewardCost("50");
    setRewardCategory("romance");
    setRewardFavorite(false);
    setEditingRewardId(null);
  }

  function submitDatePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dateTitle.trim()) {
      return;
    }

    const nextPlan = {
      title: dateTitle.trim(),
      when: dateWhen.trim(),
      location: dateLocation.trim(),
      detail: dateDetail.trim(),
      budget: dateBudget.trim(),
      status: dateStatus,
    };

    if (editingDatePlanId) {
      onUpdateDatePlan(editingDatePlanId, nextPlan);
    } else {
      onAddDatePlan(nextPlan);
    }
    setDateTitle("");
    setDateWhen("");
    setDateLocation("");
    setDateDetail("");
    setDateBudget("");
    setDateStatus("idea");
    setEditingDatePlanId(null);
  }

  function submitConnectionNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!noteContent.trim()) {
      return;
    }

    const nextNote = {
      title: noteTitle.trim() || "A little love note",
      content: noteContent.trim(),
    };

    if (editingNoteId) {
      onUpdateConnectionNote(editingNoteId, nextNote);
    } else {
      onAddConnectionNote(nextNote);
    }
    setNoteTitle("");
    setNoteContent("");
    setEditingNoteId(null);
  }

  function submitAnniversary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!anniversaryTitle.trim() || !anniversaryDate) {
      return;
    }

    const nextEntry = {
      title: anniversaryTitle.trim(),
      date: anniversaryDate,
      detail: anniversaryDetail.trim(),
      memory: anniversaryMemory.trim(),
    };

    if (editingAnniversaryId) {
      onUpdateAnniversary(editingAnniversaryId, nextEntry);
    } else {
      onAddAnniversary(nextEntry);
    }

    setAnniversaryTitle("");
    setAnniversaryDate("");
    setAnniversaryDetail("");
    setAnniversaryMemory("");
    setEditingAnniversaryId(null);
  }

  function submitBucketItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bucketTitle.trim()) {
      return;
    }

    const nextEntry = {
      title: bucketTitle.trim(),
      detail: bucketDetail.trim(),
      targetWhen: bucketWhen.trim(),
      memory: bucketMemory.trim(),
      status: bucketStatus,
    };

    if (editingBucketId) {
      onUpdateBucketListItem(editingBucketId, nextEntry);
    } else {
      onAddBucketListItem(nextEntry);
    }

    setBucketTitle("");
    setBucketDetail("");
    setBucketWhen("");
    setBucketMemory("");
    setBucketStatus("idea");
    setEditingBucketId(null);
  }

  function startEditingDatePlan(plan: PartnerDatePlan) {
    setEditingDatePlanId(plan.id);
    setDateTitle(plan.title);
    setDateWhen(plan.when);
    setDateLocation(plan.location);
    setDateDetail(plan.detail);
    setDateBudget(plan.budget);
    setDateStatus(plan.status);
  }

  function resetDatePlanEditor() {
    setEditingDatePlanId(null);
    setDateTitle("");
    setDateWhen("");
    setDateLocation("");
    setDateDetail("");
    setDateBudget("");
    setDateStatus("idea");
  }

  function startEditingConnectionNote(note: PartnerConnectionNote) {
    setEditingNoteId(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
  }

  function resetConnectionNoteEditor() {
    setEditingNoteId(null);
    setNoteTitle("");
    setNoteContent("");
  }

  function startEditingReward(reward: PartnerReward) {
    setEditingRewardId(reward.id);
    setRewardTitle(reward.title);
    setRewardDetail(reward.detail);
    setRewardCost(String(reward.cost));
    setRewardCategory(reward.category);
    setRewardFavorite(reward.favorite);
  }

  function resetRewardEditor() {
    setEditingRewardId(null);
    setRewardTitle("");
    setRewardDetail("");
    setRewardCost("50");
    setRewardCategory("romance");
    setRewardFavorite(false);
  }

  function pickSurpriseReward() {
    const pool =
      affordableRewards.length > 0
        ? affordableRewards
        : filteredRewards.length > 0
          ? filteredRewards
          : partnerSpace?.privateRewards ?? [];
    const prioritizedPool = pool.some((reward) => reward.favorite) ? pool.filter((reward) => reward.favorite) : pool;
    if (prioritizedPool.length === 0) {
      setSurpriseRewardId(null);
      return;
    }

    const picked = prioritizedPool[Math.floor(Math.random() * prioritizedPool.length)];
    setSurpriseRewardId(picked?.id ?? null);
  }

  function startEditingAnniversary(entry: PartnerAnniversary) {
    setEditingAnniversaryId(entry.id);
    setAnniversaryTitle(entry.title);
    setAnniversaryDate(entry.date);
    setAnniversaryDetail(entry.detail);
    setAnniversaryMemory(entry.memory);
  }

  function resetAnniversaryEditor() {
    setEditingAnniversaryId(null);
    setAnniversaryTitle("");
    setAnniversaryDate("");
    setAnniversaryDetail("");
    setAnniversaryMemory("");
  }

  function startEditingBucketItem(entry: PartnerBucketListItem) {
    setEditingBucketId(entry.id);
    setBucketTitle(entry.title);
    setBucketDetail(entry.detail);
    setBucketWhen(entry.targetWhen);
    setBucketMemory(entry.memory);
    setBucketStatus(entry.status);
  }

  function resetBucketEditor() {
    setEditingBucketId(null);
    setBucketTitle("");
    setBucketDetail("");
    setBucketWhen("");
    setBucketMemory("");
    setBucketStatus("idea");
  }

  return (
    <section className="space-y-5">
      <article className="family-panel family-surface-ink family-animate-rise rounded-[34px] p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="family-kicker text-[rgba(241,214,136,0.76)]">Partner</p>
            <h2 className="mt-4 font-serif text-5xl leading-[0.95] text-white">{partnerLabel}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {partnerPointCards.map(({ member, profile }) => (
              <span key={member.id} className="family-badge family-badge-gold">
                {member.name}: {profile?.pointsBalance ?? 0} pts
              </span>
            ))}
          </div>
        </div>
        {partnerSpace ? (
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="family-dark-note">
              <p className="family-kicker text-[rgba(241,214,136,0.76)]">Connection streak</p>
              <p className="mt-3 font-serif text-3xl text-white">{connectionStreak} days</p>
              <p className="mt-2 text-sm leading-6 text-stone-200">Messages or notes keep this going.</p>
            </div>
            <div className="family-dark-note">
              <p className="family-kicker text-[rgba(241,214,136,0.76)]">Next date</p>
              <p className="mt-3 font-serif text-3xl text-white">{nextDate ? nextDate.title : "Nothing booked"}</p>
              <p className="mt-2 text-sm leading-6 text-stone-200">{nextDate ? formatDateValue(nextDate.when) : "No plan yet."}</p>
            </div>
            <div className="family-dark-note">
              <p className="family-kicker text-[rgba(241,214,136,0.76)]">Next anniversary</p>
              <p className="mt-3 font-serif text-3xl text-white">{nextAnniversary ? nextAnniversary.entry.title : "Add one"}</p>
              <p className="mt-2 text-sm leading-6 text-stone-200">
                {nextAnniversary
                  ? `${nextAnniversary.daysUntil === 0 ? "Today" : `${nextAnniversary.daysUntil} day${nextAnniversary.daysUntil === 1 ? "" : "s"}`} until ${formatDateValue(nextAnniversary.entry.date)}.`
                  : "Track anniversaries and sweet memories with countdowns."}
              </p>
            </div>
            <div className="family-dark-note">
              <p className="family-kicker text-[rgba(241,214,136,0.76)]">Bucket list</p>
              <p className="mt-3 font-serif text-3xl text-white">{doneBucketCount}/{bucketList.length}</p>
              <p className="mt-2 text-sm leading-6 text-stone-200">Done vs. not done yet.</p>
            </div>
          </div>
        ) : null}
      </article>

      {canConfigurePartnerSpace ? (
        <DisclosurePanel
          kicker="Choose the pair"
          title="Choose the pair"
          summary="Pick the two people for this page."
          badge={partnerSpace ? "Configured" : "Setup"}
          className="family-panel rounded-[28px] p-5 md:p-6"
        >
          <form className="family-profile-form-grid" onSubmit={savePair}>
            <select value={pairA} onChange={(event) => setPairA(event.target.value)} className="family-select">
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            <select value={pairB} onChange={(event) => setPairB(event.target.value)} className="family-select">
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            <button type="submit" className="family-btn family-btn-primary family-profile-form-grid__wide">
              Save partner pair
            </button>
          </form>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
            Only the selected pair can use this page.
          </p>
        </DisclosurePanel>
      ) : null}

      {!partnerSpace ? (
        <article className="family-empty rounded-[28px] p-6 text-sm leading-7 text-[var(--muted)]">
          Pick the pair first.
        </article>
      ) : !canSeePrivateContent ? (
        <article className="family-empty rounded-[28px] p-6 text-sm leading-7 text-[var(--muted)]">
          This page is only for the selected pair.
        </article>
      ) : (
        <>
          <div className="family-partner-tabs">
            {[
              { value: "chat", label: "Private chat" },
              { value: "date-night", label: "Date night" },
              { value: "private-rewards", label: "Private rewards" },
              { value: "milestones", label: "Milestones" },
              { value: "closer", label: "Closer" },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value as PartnerTab)}
                className={`family-partner-tab ${activeTab === tab.value ? "family-partner-tab-active" : ""}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "chat" ? (
            <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
              <article className="family-panel rounded-[28px] p-6">
                <p className="family-kicker family-eyebrow">Private chat</p>
                <h3 className="mt-3 font-serif text-4xl leading-tight">Chat</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">Edit or delete your own messages.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {QUICK_PARTNER_MESSAGES.map((message) => (
                    <button key={message} type="button" onClick={() => onSendMessage(message)} className="family-btn family-btn-soft">
                      {message}
                    </button>
                  ))}
                </div>
                <div className="mt-5">
                  <EditableMessageThread
                    messages={partnerSpace.messages}
                    currentUserId={currentUserId}
                    emptyMessage="Start the chat."
                    composePlaceholder="Write a message..."
                    sendLabel="Send message"
                    onSendMessage={onSendMessage}
                    onEditMessage={onEditMessage}
                    onDeleteMessage={onDeleteMessage}
                  />
                </div>
              </article>

              <article className="family-panel family-surface-warm rounded-[28px] p-6">
                <p className="family-kicker family-eyebrow">Chat focus</p>
                <h3 className="mt-3 font-serif text-4xl leading-tight">Keep it warm and simple.</h3>
                <div className="mt-5 space-y-3">
                  <div className="family-sidebar-note">
                    <p className="family-kicker family-eyebrow">Good use</p>
                    <p className="mt-3 text-sm leading-7 text-[var(--muted)]">Quick check-ins, little plans, and kind notes are easier to keep up with when the page is not crowded.</p>
                  </div>
                  <div className="family-sidebar-note">
                    <p className="family-kicker family-eyebrow">New option</p>
                    <p className="mt-3 text-sm leading-7 text-[var(--muted)]">If you send the wrong text, just edit it. If it no longer belongs there, delete it.</p>
                  </div>
                  <div className="family-sidebar-note">
                    <p className="family-kicker family-eyebrow">Private space</p>
                    <p className="mt-3 text-sm leading-7 text-[var(--muted)]">Only the chosen pair can open and use this conversation area.</p>
                  </div>
                  <div className="family-sidebar-note">
                    <p className="family-kicker family-eyebrow">Relationship rhythm</p>
                    <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                      {connectionStreak > 0
                        ? `${connectionStreak} day connection streak running.`
                        : "Start with one kind note today to begin your connection streak."}
                    </p>
                  </div>
                </div>
              </article>
            </div>
          ) : null}

          {activeTab === "date-night" ? (
            <div className="grid gap-5 xl:grid-cols-[0.96fr_1.04fr]">
              <DisclosurePanel
                kicker="Date night planner"
                title="Save ideas before life gets busy."
                summary="Open this builder only when you want to add a fresh date idea."
                badge={`${partnerSpace.datePlans.length} saved`}
                className="family-panel rounded-[28px] p-5 md:p-6"
              >
                <div className="mb-4 flex flex-wrap gap-2">
                  {DATE_VIBES.map((plan) => (
                    <button
                      key={plan.title}
                      type="button"
                      onClick={() => {
                        setDateTitle(plan.title);
                        setDateWhen(plan.when);
                        setDateLocation(plan.location);
                        setDateDetail(plan.detail);
                        setDateBudget(plan.budget);
                        setDateStatus(plan.status);
                      }}
                      className="family-btn family-btn-soft"
                    >
                      {plan.title}
                    </button>
                  ))}
                </div>
                <form className="family-profile-form-grid" onSubmit={submitDatePlan}>
                  <input value={dateTitle} onChange={(event) => setDateTitle(event.target.value)} placeholder="Sunset walk and dessert" className="family-input" />
                  <input value={dateWhen} onChange={(event) => setDateWhen(event.target.value)} placeholder="Friday 7:30 PM" className="family-input" />
                  <input value={dateLocation} onChange={(event) => setDateLocation(event.target.value)} placeholder="Downtown or at home" className="family-input" />
                  <input value={dateBudget} onChange={(event) => setDateBudget(event.target.value)} placeholder="$40" className="family-input" />
                  <select value={dateStatus} onChange={(event) => setDateStatus(event.target.value as "idea" | "planned" | "booked")} className="family-select">
                    <option value="idea">Idea</option>
                    <option value="planned">Planned</option>
                    <option value="booked">Booked</option>
                  </select>
                  <textarea value={dateDetail} onChange={(event) => setDateDetail(event.target.value)} rows={4} placeholder="What would make this date feel special?" className="family-textarea family-profile-form-grid__wide" />
                  <button type="submit" className="family-btn family-btn-primary family-profile-form-grid__wide">
                    {editingDatePlanId ? "Update date plan" : "Save date plan"}
                  </button>
                  {editingDatePlanId ? (
                    <button type="button" onClick={resetDatePlanEditor} className="family-btn family-btn-soft family-profile-form-grid__wide">
                      Cancel edit
                    </button>
                  ) : null}
                </form>
              </DisclosurePanel>

              <article className="family-panel rounded-[28px] p-6">
                <p className="family-kicker family-eyebrow">Saved plans</p>
                <h3 className="mt-3 font-serif text-4xl leading-tight">Date ideas waiting for their moment.</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="family-sidebar-note">
                    <p className="family-kicker family-eyebrow">Ideas</p>
                    <p className="mt-3 font-serif text-3xl">{partnerSpace.datePlans.filter((plan) => plan.status === "idea").length}</p>
                  </div>
                  <div className="family-sidebar-note">
                    <p className="family-kicker family-eyebrow">Planned</p>
                    <p className="mt-3 font-serif text-3xl">{partnerSpace.datePlans.filter((plan) => plan.status === "planned").length}</p>
                  </div>
                  <div className="family-sidebar-note">
                    <p className="family-kicker family-eyebrow">Booked</p>
                    <p className="mt-3 font-serif text-3xl">{partnerSpace.datePlans.filter((plan) => plan.status === "booked").length}</p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3">
                  {partnerSpace.datePlans.length > 0 ? (
                    partnerSpace.datePlans.map((plan) => (
                      <div key={plan.id} className="family-profile-feed-card">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="family-kicker family-eyebrow">{plan.when || "Any time"}</p>
                            <h4 className="mt-2 font-serif text-2xl">{plan.title}</h4>
                            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                              {plan.location || "Pick the place later"}
                              {plan.budget ? ` / ${plan.budget}` : ""}
                            </p>
                            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{plan.detail || "No extra details yet."}</p>
                          </div>
                          <span className={`family-badge ${plan.status === "booked" ? "family-badge-accent" : "family-badge-warm"}`}>{plan.status}</span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button type="button" onClick={() => startEditingDatePlan(plan)} className="family-btn family-btn-soft">
                            Edit
                          </button>
                          <button type="button" onClick={() => onDeleteDatePlan(plan.id)} className="family-btn family-btn-secondary">
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="family-empty rounded-[24px] p-5 text-sm leading-7 text-[var(--muted)]">
                      Save an easy idea now so date night does not stay on the someday list.
                    </div>
                  )}
                </div>
              </article>
            </div>
          ) : null}

          {activeTab === "private-rewards" ? (
            <div className="grid gap-5 xl:grid-cols-[0.96fr_1.04fr]">
              <DisclosurePanel
                kicker="Private rewards"
                title="Build a reward shelf that feels personal."
                summary="Save sweet, playful, or restful rewards here, then mark favorites so Surprise Me gets smarter."
                badge={`${partnerSpace.privateRewards.length} saved`}
                className="family-panel rounded-[28px] p-5 md:p-6"
              >
                <div className="mb-4 flex flex-wrap gap-2">
                  {PRIVATE_REWARD_IDEAS.map((reward) => (
                    <button
                      key={reward.title}
                      type="button"
                      onClick={() => {
                        setRewardTitle(reward.title);
                        setRewardDetail(reward.detail);
                        setRewardCost(String(reward.cost));
                        setRewardCategory(reward.category);
                        setRewardFavorite(false);
                      }}
                      className="family-btn family-btn-soft"
                    >
                      {reward.title}
                    </button>
                  ))}
                </div>
                <form className="family-profile-form-grid" onSubmit={submitReward}>
                  <input value={rewardTitle} onChange={(event) => setRewardTitle(event.target.value)} placeholder="Late-sleep Saturday" className="family-input" />
                  <input type="number" min="1" value={rewardCost} onChange={(event) => setRewardCost(event.target.value)} placeholder="Points cost" className="family-input" />
                  <select value={rewardCategory} onChange={(event) => setRewardCategory(event.target.value as PartnerRewardCategory)} className="family-select">
                    {PARTNER_REWARD_CATEGORIES.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-3 rounded-[20px] border border-[var(--line-soft)] bg-white/72 px-4 py-3 text-sm text-[var(--muted)]">
                    <input type="checkbox" checked={rewardFavorite} onChange={(event) => setRewardFavorite(event.target.checked)} />
                    Save as a favorite
                  </label>
                  <textarea value={rewardDetail} onChange={(event) => setRewardDetail(event.target.value)} rows={4} placeholder="Keep it romantic, relaxing, playful, or just for the two of you." className="family-textarea family-profile-form-grid__wide" />
                  <button type="submit" className="family-btn family-btn-primary family-profile-form-grid__wide">
                    {editingRewardId ? "Update private reward" : "Save private reward"}
                  </button>
                  {editingRewardId ? (
                    <button type="button" onClick={resetRewardEditor} className="family-btn family-btn-soft family-profile-form-grid__wide">
                      Cancel edit
                    </button>
                  ) : null}
                </form>
              </DisclosurePanel>

              <article className="family-panel rounded-[28px] p-6">
                <p className="family-kicker family-eyebrow">Reward shelf</p>
                <h3 className="mt-3 font-serif text-4xl leading-tight">Spend points on each other.</h3>
                <div className="mt-4 rounded-[22px] border border-[var(--line-soft)] bg-white/72 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="family-kicker family-eyebrow">Current balance</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {partnerPointCards.map(({ member, profile }) => (
                          <span key={member.id} className="family-badge family-badge-gold">
                            {member.name}: {profile?.pointsBalance ?? 0} pts
                          </span>
                        ))}
                      </div>
                    </div>
                    <button type="button" onClick={pickSurpriseReward} className="family-btn family-btn-primary">
                      Surprise me
                    </button>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setRewardFilter("all")} className={`family-btn ${rewardFilter === "all" ? "family-btn-primary" : "family-btn-soft"}`}>
                      All
                    </button>
                    <button type="button" onClick={() => setRewardFilter("favorites")} className={`family-btn ${rewardFilter === "favorites" ? "family-btn-primary" : "family-btn-soft"}`}>
                      Favorites
                    </button>
                    {PARTNER_REWARD_CATEGORIES.map((category) => (
                      <button
                        key={category.value}
                        type="button"
                        onClick={() => setRewardFilter(category.value)}
                        className={`family-btn ${rewardFilter === category.value ? "family-btn-primary" : "family-btn-soft"}`}
                      >
                        {category.label}
                      </button>
                    ))}
                  </div>
                </div>
                {surpriseReward ? (
                  <div className="mt-4 rounded-[24px] border border-[rgba(214,178,92,0.32)] bg-[rgba(255,248,232,0.82)] p-4">
                    <p className="family-kicker family-eyebrow">Tonight&apos;s surprise pick</p>
                    <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="font-serif text-2xl">{surpriseReward.title}</h4>
                        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                          {surpriseReward.detail || "A private reward waiting for its moment."}
                        </p>
                      </div>
                      <span className="family-badge family-badge-gold">{surpriseReward.cost} pts</span>
                    </div>
                  </div>
                ) : null}
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-[22px] border border-[var(--line-soft)] bg-white/72 p-4">
                    <p className="family-kicker family-eyebrow">Favorites</p>
                    <p className="mt-2 font-serif text-3xl">{favoriteRewards.length}</p>
                  </div>
                  <div className="rounded-[22px] border border-[var(--line-soft)] bg-white/72 p-4">
                    <p className="family-kicker family-eyebrow">Times redeemed</p>
                    <p className="mt-2 font-serif text-3xl">{redeemedRewards}</p>
                  </div>
                  <div className="rounded-[22px] border border-[var(--line-soft)] bg-white/72 p-4">
                    <p className="family-kicker family-eyebrow">Showing</p>
                    <p className="mt-2 font-serif text-3xl">{filteredRewards.length}</p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3">
                  {filteredRewards.length > 0 ? (
                    filteredRewards.map((reward) => (
                      <div key={reward.id} className="family-profile-reward-card">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="family-badge family-badge-gold">{reward.cost} points</span>
                              <span className="family-badge family-badge-warm">
                                {PARTNER_REWARD_CATEGORIES.find((category) => category.value === reward.category)?.label ?? reward.category}
                              </span>
                              {reward.favorite ? <span className="family-badge family-badge-accent">Favorite</span> : null}
                            </div>
                            <h4 className="mt-2 font-serif text-2xl">{reward.title}</h4>
                            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{reward.detail || "A private reward waiting to be claimed."}</p>
                            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Added by {reward.createdByName}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onRedeemPrivateReward(reward.id)}
                            disabled={(currentProfile?.pointsBalance ?? 0) < reward.cost}
                            className="family-btn family-btn-secondary"
                          >
                            {(currentProfile?.pointsBalance ?? 0) >= reward.cost ? "Use points" : "Need points"}
                          </button>
                        </div>
                        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                          <div className="rounded-[20px] border border-[var(--line-soft)] bg-white/70 p-4">
                            <p className="family-kicker family-eyebrow">Redeemed history</p>
                            {reward.redemptionHistory.length > 0 ? (
                              <div className="mt-3 space-y-2 text-sm leading-7 text-[var(--muted)]">
                                {reward.redemptionHistory.slice(0, 3).map((entry) => (
                                  <p key={entry.id}>
                                    {entry.redeemedByName} used this on {formatTimestamp(entry.redeemedAt)}.
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">No one has used this one yet.</p>
                            )}
                          </div>
                          <div className="rounded-[20px] border border-[var(--line-soft)] bg-white/70 p-4">
                            <p className="family-kicker family-eyebrow">Redemption stats</p>
                            <p className="mt-2 font-serif text-3xl">{reward.redemptions}</p>
                            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                              {reward.lastRedeemedAt ? `Last used ${formatTimestamp(reward.lastRedeemedAt)}.` : "Still waiting for its first moment."}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button type="button" onClick={() => startEditingReward(reward)} className="family-btn family-btn-soft">
                            Edit
                          </button>
                          <button type="button" onClick={() => onDeletePrivateReward(reward.id)} className="family-btn family-btn-secondary">
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="family-empty rounded-[24px] p-5 text-sm leading-7 text-[var(--muted)]">
                      No rewards match this view yet. Try a different filter or save a new private reward.
                    </div>
                  )}
                </div>
              </article>
            </div>
          ) : null}

          {activeTab === "milestones" ? (
            <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <DisclosurePanel
                kicker="Anniversaries"
                title="Track your dates and the memories tied to them."
                summary="Save anniversaries here so the page can keep the countdown visible."
                badge={`${anniversaries.length} saved`}
                className="family-panel rounded-[28px] p-5 md:p-6"
              >
                <form className="space-y-4" onSubmit={submitAnniversary}>
                  <input value={anniversaryTitle} onChange={(event) => setAnniversaryTitle(event.target.value)} placeholder="Our wedding day" className="family-input" />
                  <input type="date" value={anniversaryDate} onChange={(event) => setAnniversaryDate(event.target.value)} className="family-input" />
                  <input value={anniversaryDetail} onChange={(event) => setAnniversaryDetail(event.target.value)} placeholder="Why this date matters" className="family-input" />
                  <textarea value={anniversaryMemory} onChange={(event) => setAnniversaryMemory(event.target.value)} rows={4} placeholder="Favorite memory from this day" className="family-textarea" />
                  <button type="submit" className="family-btn family-btn-primary">
                    {editingAnniversaryId ? "Update anniversary" : "Save anniversary"}
                  </button>
                  {editingAnniversaryId ? (
                    <button type="button" onClick={resetAnniversaryEditor} className="family-btn family-btn-soft">
                      Cancel edit
                    </button>
                  ) : null}
                </form>
                <div className="mt-5 grid gap-3">
                  {anniversaries.length > 0 ? (
                    anniversaries.map((entry) => {
                      const daysUntil = getDaysUntil(entry.date);
                      return (
                        <div key={entry.id} className="family-profile-feed-card">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="family-kicker family-eyebrow">{formatDateValue(entry.date)}</p>
                              <h4 className="mt-2 font-serif text-2xl">{entry.title}</h4>
                              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{entry.detail || "A date worth protecting."}</p>
                              {entry.memory ? <p className="mt-2 text-sm leading-7 text-[var(--muted)]">Memory: {entry.memory}</p> : null}
                            </div>
                            <span className="family-badge family-badge-gold">
                              {daysUntil === null ? "Saved" : daysUntil === 0 ? "Today" : `${daysUntil} days`}
                            </span>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-3">
                            <button type="button" onClick={() => startEditingAnniversary(entry)} className="family-btn family-btn-soft">
                              Edit
                            </button>
                            <button type="button" onClick={() => onDeleteAnniversary(entry.id)} className="family-btn family-btn-secondary">
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="family-empty rounded-[24px] p-5 text-sm leading-7 text-[var(--muted)]">
                      Save your first anniversary so Partner Space can keep the countdown alive for you.
                    </div>
                  )}
                </div>
              </DisclosurePanel>

              <DisclosurePanel
                kicker="Bucket list"
                title="Keep a list of things you still want to do together."
                summary="Save dreams, date ideas, trips, and little promises with progress and memory notes."
                badge={`${doneBucketCount}/${bucketList.length} done`}
                className="family-panel rounded-[28px] p-5 md:p-6"
              >
                <form className="space-y-4" onSubmit={submitBucketItem}>
                  <input value={bucketTitle} onChange={(event) => setBucketTitle(event.target.value)} placeholder="Weekend cabin trip" className="family-input" />
                  <input value={bucketWhen} onChange={(event) => setBucketWhen(event.target.value)} placeholder="This fall or next spring" className="family-input" />
                  <select value={bucketStatus} onChange={(event) => setBucketStatus(event.target.value as "idea" | "planned" | "done")} className="family-select">
                    <option value="idea">Idea</option>
                    <option value="planned">Planned</option>
                    <option value="done">Done</option>
                  </select>
                  <textarea value={bucketDetail} onChange={(event) => setBucketDetail(event.target.value)} rows={3} placeholder="Why this is on your list" className="family-textarea" />
                  <textarea value={bucketMemory} onChange={(event) => setBucketMemory(event.target.value)} rows={3} placeholder="Memory note after you do it" className="family-textarea" />
                  <button type="submit" className="family-btn family-btn-primary">
                    {editingBucketId ? "Update bucket item" : "Save bucket item"}
                  </button>
                  {editingBucketId ? (
                    <button type="button" onClick={resetBucketEditor} className="family-btn family-btn-soft">
                      Cancel edit
                    </button>
                  ) : null}
                </form>
                <div className="mt-5 grid gap-3">
                  {bucketList.length > 0 ? (
                    bucketList.map((entry) => (
                      <div key={entry.id} className="family-profile-feed-card">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="family-kicker family-eyebrow">{entry.targetWhen || "Any time"}</p>
                            <h4 className="mt-2 font-serif text-2xl">{entry.title}</h4>
                            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{entry.detail || "Something worth making time for together."}</p>
                            {entry.memory ? <p className="mt-2 text-sm leading-7 text-[var(--muted)]">Memory: {entry.memory}</p> : null}
                          </div>
                          <span className={`family-badge ${entry.status === "done" ? "family-badge-accent" : entry.status === "planned" ? "family-badge-gold" : "family-badge-warm"}`}>
                            {entry.status}
                          </span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button type="button" onClick={() => startEditingBucketItem(entry)} className="family-btn family-btn-soft">
                            Edit
                          </button>
                          <button type="button" onClick={() => onDeleteBucketListItem(entry.id)} className="family-btn family-btn-secondary">
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="family-empty rounded-[24px] p-5 text-sm leading-7 text-[var(--muted)]">
                      Add your first bucket-list idea so the page starts holding shared dreams, not just daily logistics.
                    </div>
                  )}
                </div>
              </DisclosurePanel>
            </div>
          ) : null}

          {activeTab === "closer" ? (
            <div className="grid gap-5 xl:grid-cols-[0.96fr_1.04fr]">
              <DisclosurePanel
                kicker="Closer together"
                title="Save little notes that matter."
                summary="Open this space when you want to add a fresh note or look at simple closeness ideas."
                badge={`${partnerSpace.connectionNotes.length} notes`}
                className="family-panel rounded-[28px] p-5 md:p-6"
              >
                <div className="mb-4 flex flex-wrap gap-2">
                  {CLOSER_NOTE_PROMPTS.map((prompt) => (
                    <button key={prompt} type="button" onClick={() => setNoteTitle(prompt)} className="family-btn family-btn-soft">
                      {prompt}
                    </button>
                  ))}
                </div>
                <form className="space-y-4" onSubmit={submitConnectionNote}>
                  <input value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} placeholder="What I loved today" className="family-input" />
                  <textarea
                    value={noteContent}
                    onChange={(event) => setNoteContent(event.target.value)}
                    rows={5}
                    placeholder="Write a kind note, thank-you, dream for the two of you, or something you noticed and appreciated."
                    className="family-textarea"
                  />
                  <button type="submit" className="family-btn family-btn-primary">
                    {editingNoteId ? "Update connection note" : "Save connection note"}
                  </button>
                  {editingNoteId ? (
                    <button type="button" onClick={resetConnectionNoteEditor} className="family-btn family-btn-soft">
                      Cancel edit
                    </button>
                  ) : null}
                </form>
                <div className="mt-5 rounded-[24px] border border-[var(--line-soft)] bg-white/72 p-5">
                  <p className="family-kicker family-eyebrow">Easy closeness ideas</p>
                  <ul className="mt-4 space-y-2 text-sm leading-7 text-[var(--muted)]">
                    <li>Send one warm note before bed.</li>
                    <li>Keep one date idea booked or planned at all times.</li>
                    <li>Use rewards for fun, rest, and affection, not just chores.</li>
                    <li>Celebrate small wins, not just big milestones.</li>
                  </ul>
                </div>
                <div className="mt-4 rounded-[24px] border border-[var(--line-soft)] bg-white/72 p-5">
                  <p className="family-kicker family-eyebrow">Current rhythm</p>
                  <p className="mt-3 font-serif text-3xl text-stone-900">{connectionStreak} day streak</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                    A streak grows when private notes or messages keep showing up on new days.
                  </p>
                </div>
              </DisclosurePanel>

              <article className="family-panel rounded-[28px] p-6">
                <p className="family-kicker family-eyebrow">Saved notes</p>
                <h3 className="mt-3 font-serif text-4xl leading-tight">Things worth remembering.</h3>
                <div className="mt-5 grid gap-3">
                  {partnerSpace.connectionNotes.length > 0 ? (
                    partnerSpace.connectionNotes.map((note) => (
                      <div key={note.id} className="family-profile-feed-card">
                        <p className="family-kicker family-eyebrow">{note.title}</p>
                        <h4 className="mt-2 font-serif text-2xl">{note.authorName}</h4>
                        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{note.content}</p>
                        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{formatTimestamp(note.createdAt)}</p>
                        {note.authorId === currentUserId ? (
                          <div className="mt-4 flex flex-wrap gap-3">
                            <button type="button" onClick={() => startEditingConnectionNote(note)} className="family-btn family-btn-soft">
                              Edit
                            </button>
                            <button type="button" onClick={() => onDeleteConnectionNote(note.id)} className="family-btn family-btn-secondary">
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="family-empty rounded-[24px] p-5 text-sm leading-7 text-[var(--muted)]">
                      Add the first note so this page starts feeling personal instead of empty.
                    </div>
                  )}
                </div>
              </article>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
