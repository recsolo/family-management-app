"use client";

import { useMemo, useState, type FormEvent } from "react";

import { DisclosurePanel } from "@/components/workspace/disclosure-panel";
import type { AppState, PartnerRewardCategory } from "@/lib/familyflow";
import type { HouseholdMember } from "@/lib/workspace";
import { EditableMessageThread } from "@/components/workspace/editable-message-thread";
import { formatTimestamp, formatDateValue, getConnectionStreak, getDaysUntil } from "@/lib/format";
import { useFormEditor } from "@/hooks/useFormEditor";

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

function formatPartnerLabel(members: HouseholdMember[]) {
  if (members.length === 2) {
    return `${members[0]?.name} + ${members[1]?.name}`;
  }

  return "Partner Space";
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
  const [rewardFilter, setRewardFilter] = useState<RewardFilter>("all");
  const [surpriseRewardId, setSurpriseRewardId] = useState<string | null>(null);

  const datePlanForm = useFormEditor<{ title: string; when: string; location: string; detail: string; budget: string; status: "idea" | "planned" | "booked" }>({
    defaults: { title: "", when: "", location: "", detail: "", budget: "", status: "idea" },
    onSubmit: (fields, editingId) => {
      if (editingId) {
        onUpdateDatePlan(editingId, fields);
      } else {
        onAddDatePlan(fields);
      }
    },
    validate: (fields) => Boolean(fields.title.trim()),
  });

  const connectionNoteForm = useFormEditor({
    defaults: { title: "", content: "" },
    onSubmit: (fields, editingId) => {
      const note = {
        title: fields.title.trim() || "A little love note",
        content: fields.content.trim(),
      };
      if (editingId) {
        onUpdateConnectionNote(editingId, note);
      } else {
        onAddConnectionNote(note);
      }
    },
    validate: (fields) => Boolean(fields.content.trim()),
  });

  const rewardForm = useFormEditor({
    defaults: { title: "", detail: "", cost: "50", category: "romance" as PartnerRewardCategory, favorite: false },
    onSubmit: (fields, editingId) => {
      const nextReward: PartnerRewardInput = {
        title: fields.title.trim(),
        detail: fields.detail.trim(),
        cost: Number(fields.cost) || 50,
        category: fields.category,
        favorite: fields.favorite,
      };
      if (editingId) {
        onUpdatePrivateReward(editingId, nextReward);
      } else {
        onAddPrivateReward(nextReward);
      }
    },
    validate: (fields) => Boolean(fields.title.trim()),
  });

  const anniversaryForm = useFormEditor({
    defaults: { title: "", date: "", detail: "", memory: "" },
    onSubmit: (fields, editingId) => {
      if (editingId) {
        onUpdateAnniversary(editingId, fields);
      } else {
        onAddAnniversary(fields);
      }
    },
    validate: (fields) => Boolean(fields.title.trim() && fields.date),
  });

  const bucketForm = useFormEditor<{ title: string; detail: string; targetWhen: string; memory: string; status: "idea" | "planned" | "done" }>({
    defaults: { title: "", detail: "", targetWhen: "", memory: "", status: "idea" },
    onSubmit: (fields, editingId) => {
      if (editingId) {
        onUpdateBucketListItem(editingId, fields);
      } else {
        onAddBucketListItem(fields);
      }
    },
    validate: (fields) => Boolean(fields.title.trim()),
  });

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

  return (
    <section className="space-y-5">
      <article className="family-panel family-surface-ink family-animate-rise rounded-[30px] p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="family-kicker text-[rgba(241,214,136,0.76)]">Partner</p>
            <h2 className="mt-4 font-serif text-5xl leading-[0.95] text-white">Partner Space</h2>
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
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="family-dark-note">
              <p className="family-kicker text-[rgba(241,214,136,0.76)]">Connection streak</p>
              <p className="mt-3 font-serif text-3xl text-white">{connectionStreak} days</p>
            </div>
            <div className="family-dark-note">
              <p className="family-kicker text-[rgba(241,214,136,0.76)]">Next date</p>
              <p className="mt-3 font-serif text-3xl text-white">{nextDate ? nextDate.title : "Nothing booked"}</p>
              <p className="mt-2 text-sm leading-6 text-stone-200">{nextDate ? formatDateValue(nextDate.when) : "No plan yet."}</p>
            </div>
            <div className="family-dark-note">
              <p className="family-kicker text-[rgba(241,214,136,0.76)]">Milestones</p>
              <p className="mt-3 font-serif text-3xl text-white">{nextAnniversary ? nextAnniversary.entry.title : `${doneBucketCount}/${bucketList.length}`}</p>
              <p className="mt-2 text-sm leading-6 text-stone-200">
                {nextAnniversary
                  ? nextAnniversary.daysUntil === 0
                    ? "Today"
                    : `${nextAnniversary.daysUntil} day${nextAnniversary.daysUntil === 1 ? "" : "s"} left`
                  : "Bucket list progress"}
              </p>
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
              { value: "chat", label: "Chat" },
              { value: "date-night", label: "Date night" },
              { value: "private-rewards", label: "Rewards" },
              { value: "milestones", label: "Milestones" },
              { value: "closer", label: "Notes" },
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

            </div>
          ) : null}

          {activeTab === "date-night" ? (
            <div className="grid gap-5 xl:grid-cols-[0.96fr_1.04fr]">
              <DisclosurePanel
                kicker="Date night planner"
                title="Date plans"
                summary="Open this when you want to add a date."
                badge={`${partnerSpace.datePlans.length} saved`}
                className="family-panel rounded-[28px] p-5 md:p-6"
              >
                <div className="mb-4 flex flex-wrap gap-2">
                  {DATE_VIBES.map((plan) => (
                    <button
                      key={plan.title}
                      type="button"
                      onClick={() => {
                        datePlanForm.setFields({
                          title: plan.title,
                          when: plan.when,
                          location: plan.location,
                          detail: plan.detail,
                          budget: plan.budget,
                          status: plan.status,
                        });
                      }}
                      className="family-btn family-btn-soft"
                    >
                      {plan.title}
                    </button>
                  ))}
                </div>
                <form className="family-profile-form-grid" onSubmit={datePlanForm.handleSubmit}>
                  <input value={datePlanForm.fields.title} onChange={(event) => datePlanForm.setField("title", event.target.value)} placeholder="Sunset walk and dessert" className="family-input" />
                  <input value={datePlanForm.fields.when} onChange={(event) => datePlanForm.setField("when", event.target.value)} placeholder="Friday 7:30 PM" className="family-input" />
                  <input value={datePlanForm.fields.location} onChange={(event) => datePlanForm.setField("location", event.target.value)} placeholder="Downtown or at home" className="family-input" />
                  <input value={datePlanForm.fields.budget} onChange={(event) => datePlanForm.setField("budget", event.target.value)} placeholder="$40" className="family-input" />
                  <select value={datePlanForm.fields.status} onChange={(event) => datePlanForm.setField("status", event.target.value as "idea" | "planned" | "booked")} className="family-select">
                    <option value="idea">Idea</option>
                    <option value="planned">Planned</option>
                    <option value="booked">Booked</option>
                  </select>
                  <textarea value={datePlanForm.fields.detail} onChange={(event) => datePlanForm.setField("detail", event.target.value)} rows={4} placeholder="What would make this date feel special?" className="family-textarea family-profile-form-grid__wide" />
                  <button type="submit" className="family-btn family-btn-primary family-profile-form-grid__wide">
                    {datePlanForm.isEditing ? "Update date plan" : "Save date plan"}
                  </button>
                  {datePlanForm.isEditing ? (
                    <button type="button" onClick={datePlanForm.reset} className="family-btn family-btn-soft family-profile-form-grid__wide">
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
                          <button type="button" onClick={() => datePlanForm.startEditing(plan.id, { title: plan.title, when: plan.when, location: plan.location, detail: plan.detail, budget: plan.budget, status: plan.status })} className="family-btn family-btn-soft">
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
                        rewardForm.setFields({
                          title: reward.title,
                          detail: reward.detail,
                          cost: String(reward.cost),
                          category: reward.category,
                          favorite: false,
                        });
                      }}
                      className="family-btn family-btn-soft"
                    >
                      {reward.title}
                    </button>
                  ))}
                </div>
                <form className="family-profile-form-grid" onSubmit={rewardForm.handleSubmit}>
                  <input value={rewardForm.fields.title} onChange={(event) => rewardForm.setField("title", event.target.value)} placeholder="Late-sleep Saturday" className="family-input" />
                  <input type="number" min="1" value={rewardForm.fields.cost} onChange={(event) => rewardForm.setField("cost", event.target.value)} placeholder="Points cost" className="family-input" />
                  <select value={rewardForm.fields.category} onChange={(event) => rewardForm.setField("category", event.target.value as PartnerRewardCategory)} className="family-select">
                    {PARTNER_REWARD_CATEGORIES.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-3 rounded-[20px] border border-[var(--line-soft)] bg-white/72 px-4 py-3 text-sm text-[var(--muted)]">
                    <input type="checkbox" checked={rewardForm.fields.favorite} onChange={(event) => rewardForm.setField("favorite", event.target.checked)} />
                    Save as a favorite
                  </label>
                  <textarea value={rewardForm.fields.detail} onChange={(event) => rewardForm.setField("detail", event.target.value)} rows={4} placeholder="Keep it romantic, relaxing, playful, or just for the two of you." className="family-textarea family-profile-form-grid__wide" />
                  <button type="submit" className="family-btn family-btn-primary family-profile-form-grid__wide">
                    {rewardForm.isEditing ? "Update private reward" : "Save private reward"}
                  </button>
                  {rewardForm.isEditing ? (
                    <button type="button" onClick={rewardForm.reset} className="family-btn family-btn-soft family-profile-form-grid__wide">
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
                          <button type="button" onClick={() => rewardForm.startEditing(reward.id, { title: reward.title, detail: reward.detail, cost: String(reward.cost), category: reward.category, favorite: reward.favorite })} className="family-btn family-btn-soft">
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
                title="Anniversaries"
                summary="Open this when you want to add or update a date."
                badge={`${anniversaries.length} saved`}
                className="family-panel rounded-[28px] p-5 md:p-6"
              >
                <form className="space-y-4" onSubmit={anniversaryForm.handleSubmit}>
                  <input value={anniversaryForm.fields.title} onChange={(event) => anniversaryForm.setField("title", event.target.value)} placeholder="Our wedding day" className="family-input" />
                  <input type="date" value={anniversaryForm.fields.date} onChange={(event) => anniversaryForm.setField("date", event.target.value)} className="family-input" />
                  <input value={anniversaryForm.fields.detail} onChange={(event) => anniversaryForm.setField("detail", event.target.value)} placeholder="Why this date matters" className="family-input" />
                  <textarea value={anniversaryForm.fields.memory} onChange={(event) => anniversaryForm.setField("memory", event.target.value)} rows={4} placeholder="Favorite memory from this day" className="family-textarea" />
                  <button type="submit" className="family-btn family-btn-primary">
                    {anniversaryForm.isEditing ? "Update anniversary" : "Save anniversary"}
                  </button>
                  {anniversaryForm.isEditing ? (
                    <button type="button" onClick={anniversaryForm.reset} className="family-btn family-btn-soft">
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
                            <button type="button" onClick={() => anniversaryForm.startEditing(entry.id, { title: entry.title, date: entry.date, detail: entry.detail, memory: entry.memory })} className="family-btn family-btn-soft">
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
                title="Bucket list"
                summary="Open this when you want to add or update a plan."
                badge={`${doneBucketCount}/${bucketList.length} done`}
                className="family-panel rounded-[28px] p-5 md:p-6"
              >
                <form className="space-y-4" onSubmit={bucketForm.handleSubmit}>
                  <input value={bucketForm.fields.title} onChange={(event) => bucketForm.setField("title", event.target.value)} placeholder="Weekend cabin trip" className="family-input" />
                  <input value={bucketForm.fields.targetWhen} onChange={(event) => bucketForm.setField("targetWhen", event.target.value)} placeholder="This fall or next spring" className="family-input" />
                  <select value={bucketForm.fields.status} onChange={(event) => bucketForm.setField("status", event.target.value as "idea" | "planned" | "done")} className="family-select">
                    <option value="idea">Idea</option>
                    <option value="planned">Planned</option>
                    <option value="done">Done</option>
                  </select>
                  <textarea value={bucketForm.fields.detail} onChange={(event) => bucketForm.setField("detail", event.target.value)} rows={3} placeholder="Why this is on your list" className="family-textarea" />
                  <textarea value={bucketForm.fields.memory} onChange={(event) => bucketForm.setField("memory", event.target.value)} rows={3} placeholder="Memory note after you do it" className="family-textarea" />
                  <button type="submit" className="family-btn family-btn-primary">
                    {bucketForm.isEditing ? "Update bucket item" : "Save bucket item"}
                  </button>
                  {bucketForm.isEditing ? (
                    <button type="button" onClick={bucketForm.reset} className="family-btn family-btn-soft">
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
                          <button type="button" onClick={() => bucketForm.startEditing(entry.id, { title: entry.title, detail: entry.detail, targetWhen: entry.targetWhen, memory: entry.memory, status: entry.status })} className="family-btn family-btn-soft">
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
                title="Notes"
                summary="Open this when you want to add a note."
                badge={`${partnerSpace.connectionNotes.length} notes`}
                className="family-panel rounded-[28px] p-5 md:p-6"
              >
                <div className="mb-4 flex flex-wrap gap-2">
                  {CLOSER_NOTE_PROMPTS.map((prompt) => (
                    <button key={prompt} type="button" onClick={() => connectionNoteForm.setField("title", prompt)} className="family-btn family-btn-soft">
                      {prompt}
                    </button>
                  ))}
                </div>
                <form className="space-y-4" onSubmit={connectionNoteForm.handleSubmit}>
                  <input value={connectionNoteForm.fields.title} onChange={(event) => connectionNoteForm.setField("title", event.target.value)} placeholder="What I loved today" className="family-input" />
                  <textarea
                    value={connectionNoteForm.fields.content}
                    onChange={(event) => connectionNoteForm.setField("content", event.target.value)}
                    rows={5}
                    placeholder="Write a kind note, thank-you, dream for the two of you, or something you noticed and appreciated."
                    className="family-textarea"
                  />
                  <button type="submit" className="family-btn family-btn-primary">
                    {connectionNoteForm.isEditing ? "Update connection note" : "Save connection note"}
                  </button>
                  {connectionNoteForm.isEditing ? (
                    <button type="button" onClick={connectionNoteForm.reset} className="family-btn family-btn-soft">
                      Cancel edit
                    </button>
                  ) : null}
                </form>
              </DisclosurePanel>

              <article className="family-panel rounded-[28px] p-6">
                <p className="family-kicker family-eyebrow">Saved notes</p>
                <h3 className="mt-3 font-serif text-4xl leading-tight">Notes</h3>
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
                            <button type="button" onClick={() => connectionNoteForm.startEditing(note.id, { title: note.title, content: note.content })} className="family-btn family-btn-soft">
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
