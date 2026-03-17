"use client";

import { useMemo, useState, type FormEvent } from "react";

import type { AppState } from "@/lib/familyflow";
import type { HouseholdMember } from "@/lib/workspace";

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
  onAddPrivateReward,
  onRedeemPrivateReward,
  onAddDatePlan,
  onAddConnectionNote,
}: Props) {
  const [activeTab, setActiveTab] = useState<PartnerTab>("chat");
  const [pairA, setPairA] = useState(partnerSpace?.memberIds[0] ?? members[0]?.id ?? "");
  const [pairB, setPairB] = useState(partnerSpace?.memberIds[1] ?? members[1]?.id ?? "");
  const [chatInput, setChatInput] = useState("");
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

  function savePair(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pairA || !pairB || pairA === pairB) {
      return;
    }

    onConfigurePartnerSpace([pairA, pairB]);
  }

  function submitChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chatInput.trim()) {
      return;
    }

    onSendMessage(chatInput.trim());
    setChatInput("");
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
      </article>

      {canConfigurePartnerSpace ? (
        <article className="family-panel rounded-[28px] p-6">
          <p className="family-kicker family-eyebrow">Choose the pair</p>
          <h3 className="mt-3 font-serif text-4xl leading-tight">Decide who uses this private page.</h3>
          <form className="family-profile-form-grid mt-5" onSubmit={savePair}>
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
        </article>
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
            <div className="grid gap-5 xl:grid-cols-[1.02fr_0.98fr]">
              <article className="family-panel rounded-[28px] p-6">
                <p className="family-kicker family-eyebrow">Private chat</p>
                <h3 className="mt-3 font-serif text-4xl leading-tight">Talk without losing the thread.</h3>
                <div className="mt-5 space-y-3">
                  {partnerSpace.messages.length > 0 ? (
                    partnerSpace.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`family-chat-bubble ${message.senderId === currentUserId ? "family-chat-user" : "family-chat-assistant"}`}
                      >
                        <p className="family-kicker opacity-70">{message.senderName}</p>
                        <p className="mt-2 whitespace-pre-wrap">{message.content}</p>
                        <p className="mt-3 text-xs opacity-70">{formatTimestamp(message.createdAt)}</p>
                      </div>
                    ))
                  ) : (
                    <div className="family-empty rounded-[24px] p-5 text-sm leading-7 text-[var(--muted)]">
                      Start the first private message so this page feels like your shared corner of the app.
                    </div>
                  )}
                </div>
              </article>

              <article className="family-panel rounded-[28px] p-6">
                <p className="family-kicker family-eyebrow">Send a note</p>
                <h3 className="mt-3 font-serif text-4xl leading-tight">Keep the conversation warm.</h3>
                <form className="mt-5 space-y-4" onSubmit={submitChat}>
                  <textarea
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    rows={6}
                    placeholder="Write a sweet note, a quick check-in, or tonight's plan..."
                    className="family-textarea"
                  />
                  <button type="submit" className="family-btn family-btn-primary">
                    Send private message
                  </button>
                </form>
              </article>
            </div>
          ) : null}

          {activeTab === "date-night" ? (
            <div className="grid gap-5 xl:grid-cols-[0.96fr_1.04fr]">
              <article className="family-panel rounded-[28px] p-6">
                <p className="family-kicker family-eyebrow">Date night planner</p>
                <h3 className="mt-3 font-serif text-4xl leading-tight">Save ideas before life gets busy.</h3>
                <form className="family-profile-form-grid mt-5" onSubmit={submitDatePlan}>
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
              </article>

              <article className="family-panel rounded-[28px] p-6">
                <p className="family-kicker family-eyebrow">Saved plans</p>
                <h3 className="mt-3 font-serif text-4xl leading-tight">Date ideas waiting for their moment.</h3>
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
              <article className="family-panel rounded-[28px] p-6">
                <p className="family-kicker family-eyebrow">Private rewards</p>
                <h3 className="mt-3 font-serif text-4xl leading-tight">Turn points into playful rewards.</h3>
                <form className="family-profile-form-grid mt-5" onSubmit={submitReward}>
                  <input value={rewardTitle} onChange={(event) => setRewardTitle(event.target.value)} placeholder="Late-sleep Saturday" className="family-input" />
                  <input type="number" min="1" value={rewardCost} onChange={(event) => setRewardCost(event.target.value)} placeholder="Points cost" className="family-input" />
                  <textarea value={rewardDetail} onChange={(event) => setRewardDetail(event.target.value)} rows={4} placeholder="Keep it romantic, relaxing, playful, or just for the two of you." className="family-textarea family-profile-form-grid__wide" />
                  <button type="submit" className="family-btn family-btn-primary family-profile-form-grid__wide">
                    Save private reward
                  </button>
                </form>
              </article>

              <article className="family-panel rounded-[28px] p-6">
                <p className="family-kicker family-eyebrow">Reward shelf</p>
                <h3 className="mt-3 font-serif text-4xl leading-tight">Spend points on each other.</h3>
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
              <article className="family-panel rounded-[28px] p-6">
                <p className="family-kicker family-eyebrow">Closer together</p>
                <h3 className="mt-3 font-serif text-4xl leading-tight">Save little notes that matter.</h3>
                <form className="mt-5 space-y-4" onSubmit={submitConnectionNote}>
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
              </article>

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
