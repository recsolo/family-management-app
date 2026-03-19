"use client";

import { useMemo, useState, type FormEvent } from "react";

import { DisclosurePanel } from "@/components/workspace/disclosure-panel";
import type { AppState } from "@/lib/familyflow";
import type { HouseholdMember } from "@/lib/workspace";
import { EditableMessageThread } from "@/components/workspace/editable-message-thread";

type PartnerTab = "chat" | "date-night" | "private-rewards" | "closer";

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
  onAddPrivateReward: (reward: { title: string; detail: string; cost: number }) => void;
  onRedeemPrivateReward: (rewardId: string) => void;
  onAddDatePlan: (plan: {
    title: string;
    when: string;
    location: string;
    detail: string;
    budget: string;
    status: "idea" | "planned" | "booked";
  }) => void;
  onAddConnectionNote: (note: { title: string; content: string }) => void;
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

const QUICK_PARTNER_MESSAGES = [
  "Thinking about you today.",
  "What would feel fun for us this week?",
  "Thank you for showing up for our family.",
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
  { title: "Massage night", detail: "One cozy, no-rush back rub and quiet time together.", cost: 40 },
  { title: "Sleep-in pass", detail: "One partner takes the morning so the other can fully rest.", cost: 55 },
  { title: "Pick the whole date", detail: "Choose the plan, the vibe, and the food with zero debate.", cost: 70 },
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
  onRedeemPrivateReward,
  onAddDatePlan,
  onAddConnectionNote,
}: Props) {
  const [activeTab, setActiveTab] = useState<PartnerTab>("chat");
  const [pairA, setPairA] = useState(partnerSpace?.memberIds[0] ?? members[0]?.id ?? "");
  const [pairB, setPairB] = useState(partnerSpace?.memberIds[1] ?? members[1]?.id ?? "");
  const [rewardTitle, setRewardTitle] = useState("");
  const [rewardDetail, setRewardDetail] = useState("");
  const [rewardCost, setRewardCost] = useState("50");
  const [dateTitle, setDateTitle] = useState("");
  const [dateWhen, setDateWhen] = useState("");
  const [dateLocation, setDateLocation] = useState("");
  const [dateDetail, setDateDetail] = useState("");
  const [dateBudget, setDateBudget] = useState("");
  const [dateStatus, setDateStatus] = useState<"idea" | "planned" | "booked">("idea");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");

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

    onAddPrivateReward({
      title: rewardTitle.trim(),
      detail: rewardDetail.trim(),
      cost: Number(rewardCost) || 50,
    });
    setRewardTitle("");
    setRewardDetail("");
    setRewardCost("50");
  }

  function submitDatePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dateTitle.trim()) {
      return;
    }

    onAddDatePlan({
      title: dateTitle.trim(),
      when: dateWhen.trim(),
      location: dateLocation.trim(),
      detail: dateDetail.trim(),
      budget: dateBudget.trim(),
      status: dateStatus,
    });
    setDateTitle("");
    setDateWhen("");
    setDateLocation("");
    setDateDetail("");
    setDateBudget("");
    setDateStatus("idea");
  }

  function submitConnectionNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!noteContent.trim()) {
      return;
    }

    onAddConnectionNote({
      title: noteTitle.trim() || "A little love note",
      content: noteContent.trim(),
    });
    setNoteTitle("");
    setNoteContent("");
  }

  return (
    <section className="space-y-5">
      <article className="family-panel family-surface-ink family-animate-rise rounded-[34px] p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="family-kicker text-[rgba(241,214,136,0.76)]">Partner Space</p>
            <h2 className="mt-4 font-serif text-5xl leading-[0.95] text-white">{partnerLabel}</h2>
            <p className="mt-4 max-w-3xl text-sm leading-8 text-stone-200">
              This private page is for the chosen pair to chat, plan dates, save rewards, and keep little moments close.
            </p>
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
              <p className="mt-2 text-sm leading-6 text-stone-200">Private notes or messages keep the streak going.</p>
            </div>
            <div className="family-dark-note">
              <p className="family-kicker text-[rgba(241,214,136,0.76)]">Next date</p>
              <p className="mt-3 font-serif text-3xl text-white">{nextDate ? nextDate.title : "Nothing booked"}</p>
              <p className="mt-2 text-sm leading-6 text-stone-200">{nextDate ? formatDateValue(nextDate.when) : "Save one easy plan so it stops living in someday."}</p>
            </div>
            <div className="family-dark-note">
              <p className="family-kicker text-[rgba(241,214,136,0.76)]">Private rewards</p>
              <p className="mt-3 font-serif text-3xl text-white">{partnerSpace.privateRewards.length}</p>
              <p className="mt-2 text-sm leading-6 text-stone-200">{redeemedRewards} reward{redeemedRewards === 1 ? "" : "s"} redeemed so far.</p>
            </div>
            <div className="family-dark-note">
              <p className="family-kicker text-[rgba(241,214,136,0.76)]">Closer notes</p>
              <p className="mt-3 font-serif text-3xl text-white">{partnerSpace.connectionNotes.length}</p>
              <p className="mt-2 text-sm leading-6 text-stone-200">Small appreciation moments stay easy to revisit.</p>
            </div>
          </div>
        ) : null}
      </article>

      {canConfigurePartnerSpace ? (
        <DisclosurePanel
          kicker="Choose the pair"
          title="Decide who uses this private page."
          summary="Keep the partner picker tucked away after the pair is set."
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
            Only the selected pair should use the private messages, date-night plans, and private rewards on this page.
          </p>
        </DisclosurePanel>
      ) : null}

      {!partnerSpace ? (
        <article className="family-empty rounded-[28px] p-6 text-sm leading-7 text-[var(--muted)]">
          Set the partner pair first, then this page turns into a private space for messages, date nights, and rewards.
        </article>
      ) : !canSeePrivateContent ? (
        <article className="family-empty rounded-[28px] p-6 text-sm leading-7 text-[var(--muted)]">
          This page is private to the chosen pair. You can still see who is selected above, but the private chat and date tools stay hidden unless you are one of the two people in the pair.
        </article>
      ) : (
        <>
          <div className="family-partner-tabs">
            {[
              { value: "chat", label: "Private chat" },
              { value: "date-night", label: "Date night" },
              { value: "private-rewards", label: "Private rewards" },
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
                <h3 className="mt-3 font-serif text-4xl leading-tight">Talk without losing the thread.</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">Your own private notes can be edited or deleted after sending.</p>
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
                    emptyMessage="Start the first private message so this page feels like your shared corner of the app."
                    composePlaceholder="Write a sweet note, a quick check-in, or tonight's plan..."
                    sendLabel="Send private message"
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
                    Save date plan
                  </button>
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
                title="Turn points into playful rewards."
                summary="Open this builder when you want to add something new to the private reward shelf."
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
                  <textarea value={rewardDetail} onChange={(event) => setRewardDetail(event.target.value)} rows={4} placeholder="Keep it romantic, relaxing, playful, or just for the two of you." className="family-textarea family-profile-form-grid__wide" />
                  <button type="submit" className="family-btn family-btn-primary family-profile-form-grid__wide">
                    Save private reward
                  </button>
                </form>
              </DisclosurePanel>

              <article className="family-panel rounded-[28px] p-6">
                <p className="family-kicker family-eyebrow">Reward shelf</p>
                <h3 className="mt-3 font-serif text-4xl leading-tight">Spend points on each other.</h3>
                <div className="mt-4 rounded-[22px] border border-[var(--line-soft)] bg-white/72 p-4">
                  <p className="family-kicker family-eyebrow">Current balance</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {partnerPointCards.map(({ member, profile }) => (
                      <span key={member.id} className="family-badge family-badge-gold">
                        {member.name}: {profile?.pointsBalance ?? 0} pts
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-5 grid gap-3">
                  {partnerSpace.privateRewards.length > 0 ? (
                    partnerSpace.privateRewards.map((reward) => (
                      <div key={reward.id} className="family-profile-reward-card">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="family-kicker family-eyebrow">{reward.cost} points</p>
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
                      </div>
                    ))
                  ) : (
                    <div className="family-empty rounded-[24px] p-5 text-sm leading-7 text-[var(--muted)]">
                      Add a private reward to make points feel playful and personal.
                    </div>
                  )}
                </div>
              </article>
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
                    Save connection note
                  </button>
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
