import { useEffect, useRef, useState } from "react";
import { Check, Copy, Link2, Send, UserRound, Users } from "lucide-react";
import type { StoredTeam } from "../storage";
import { activities } from "../data";
import { siteUrl } from "../paths";
import {
  confirmedTeamSize,
  makeTeamReply,
  reviewTeamReply,
  teamReplyUrl,
  type RelayStatus,
  type TeamReply,
} from "../teamRelay";
import "./team-relay.css";

export interface TeamRelayProps {
  team: StoredTeam;
  onChange: (next: StoredTeam) => void;
  baseUrl?: string;
  example?: boolean;
}

export function TeamRelay({
  team,
  onChange,
  baseUrl,
  example = false,
}: TeamRelayProps) {
  const [name, setName] = useState(team.myResponse?.name || "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const resultBox = useRef<HTMLDivElement>(null);
  const copyButton = useRef<HTMLButtonElement>(null);
  const revealResult = useRef(false);
  useEffect(() => {
    setName(team.myResponse?.name || "");
    setMessage("");
    setError("");
  }, [team.id]);
  useEffect(() => {
    if (!revealResult.current || !team.myResponse) return;
    revealResult.current = false;
    resultBox.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    copyButton.current?.focus({ preventScroll: true });
  }, [team.myResponse?.revision]);
  if (example)
    return (
      <section className="team-relay team-relay-example">
        <Users size={20} />
        <div>
          <h3>先看看组队方式</h3>
          <p>
            这是示例小队，没有真实发起人。创建自己的小队后，就能邀请朋友并接收参加回执。
          </p>
        </div>
      </section>
    );
  if (team.host) {
    const members = team.confirmedMembers || [];
    return (
      <section className="team-relay" aria-label="小队回执名单">
        <div className="team-relay-heading">
          <Users size={20} />
          <h3>已确认同行</h3>
          <b>
            {confirmedTeamSize(team)} / {team.capacity} 人
          </b>
        </div>
        <p>邀请发给朋友 → 朋友生成回执 → 发回给你 → 打开并确认导入。</p>
        <ul className="team-relay-members">
          <li>
            <UserRound size={17} />
            <strong>我（发起人）</strong>
            <span>已计入</span>
          </li>
          {members.map((member) => (
            <li
              key={member.id}
              className={member.status === "withdrawn" ? "is-withdrawn" : ""}
            >
              <UserRound size={17} />
              <strong>{member.name}</strong>
              <span>
                {member.status === "confirmed" ? "已导入确认" : "已撤回"}
              </span>
            </li>
          ))}
        </ul>
        {!members.length && (
          <p className="team-relay-empty">
            还没有朋友的回执。发出邀请后，请朋友把生成的回执链接发回给你。
          </p>
        )}
        <p className="team-relay-note">
          名单保存在此浏览器。昵称由朋友填写，导入前请核对；不会实时更新或自动发送消息。
        </p>
      </section>
    );
  }
  const response = team.myResponse;
  const reply: TeamReply | undefined = response
    ? {
        v: 1,
        teamId: team.id,
        activityId: team.activityId,
        date: team.date,
        member: response,
      }
    : undefined;
  const url = reply ? teamReplyUrl(reply, baseUrl || siteUrl()) : "";
  const generate = (status: RelayStatus) => {
    const result = makeTeamReply(team, name, status);
    if (!result.ok) {
      setError(result.error);
      setMessage("");
      return;
    }
    revealResult.current = true;
    onChange(result.nextTeam);
    setError("");
    setMessage(
      status === "withdrawn"
        ? "撤回回执已生成。请发给发起人，导入后才会释放名额。"
        : "参加回执已生成。请发给发起人，由对方确认导入。",
    );
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("已复制回执链接，请通过你们已有的聊天发给发起人。");
    } catch {
      setMessage("可点击下方链接框全选，再手动复制发送。");
    }
  };
  return (
    <section className="team-relay" aria-label="生成我的参加回执">
      <div className="team-relay-heading">
        <Send size={20} />
        <h3>{response ? "把回执发给发起人" : "想一起去？先留个昵称"}</h3>
      </div>
      <p>填写昵称生成回执链接。发起人打开并确认后，才会将你加入名单。</p>
      <label className="field">
        你的同行昵称
        <input
          value={name}
          maxLength={20}
          autoComplete="off"
          placeholder="让朋友认得出的昵称"
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <p className="team-relay-note">
        昵称由你自行填写；请勿填写电话、微信号等联系方式。收到回执链接的人都能查看昵称。
      </p>
      <div className="team-relay-actions">
        <button
          type="button"
          className="primary"
          onClick={() => generate("confirmed")}
        >
          <Check size={17} />
          {response ? "重新生成参加回执" : "确认参加，生成回执"}
        </button>
        {response?.status === "confirmed" && (
          <button
            type="button"
            className="outline"
            onClick={() => generate("withdrawn")}
          >
            生成撤回回执
          </button>
        )}
      </div>
      {error && (
        <p className="team-relay-error" role="alert">
          {error}
        </p>
      )}
      {response && (
        <div className="team-relay-result" ref={resultBox}>
          <strong>
            <Link2 size={17} />
            {response.status === "confirmed"
              ? "参加回执 · 等你发回"
              : "撤回回执 · 等你发回"}
          </strong>
          <label className="field">
            回执链接
            <input
              readOnly
              value={url}
              onFocus={(event) => event.target.select()}
            />
          </label>
          <button
            type="button"
            className="outline"
            ref={copyButton}
            onClick={copy}
          >
            <Copy size={16} />
            复制回执链接
          </button>
          <p>
            请用同一浏览器修改意向并发送新回执。此处无法获知发起人是否已经导入。
          </p>
        </div>
      )}
      <p className="team-relay-status" role="status">
        {message}
      </p>
    </section>
  );
}

export function TeamReplyPreview({
  team,
  reply,
  onConfirm,
  onCancel,
}: {
  team?: StoredTeam;
  reply: TeamReply;
  onConfirm: (reply: TeamReply) => void;
  onCancel: () => void;
}) {
  const review = team ? reviewTeamReply(team, reply) : undefined;
  const activity = activities.find((item) => item.id === reply.activityId);
  return (
    <div className="dialog-content team-reply-preview">
      <span className="icon-tile big">
        <Send size={26} />
      </span>
      <h2>
        收到一份{reply.member.status === "confirmed" ? "参加" : "撤回"}回执
      </h2>
      <p className="dialog-description">先核对，再更新你的小队名单。</p>
      <dl className="team-reply-facts">
        <div>
          <dt>对方填写的昵称</dt>
          <dd>{reply.member.name}</dd>
        </div>
        <div>
          <dt>活动</dt>
          <dd>{activity?.title || reply.activityId}</dd>
        </div>
        <div>
          <dt>出发时间</dt>
          <dd>{reply.date.replace("T", " ")}</dd>
        </div>
        <div>
          <dt>这次意向</dt>
          <dd>
            {reply.member.status === "confirmed" ? "确认参加" : "撤回参加"} · 第{" "}
            {reply.member.revision} 版
          </dd>
        </div>
      </dl>
      {!review ? (
        <p className="team-relay-error" role="alert">
          当前浏览器没有这个小队的发起人记录。请回到创建小队的浏览器打开，或先恢复自己的备份。
        </p>
      ) : !review.ok ? (
        <p className="team-relay-error" role="alert">
          {review.error}
        </p>
      ) : (
        <div className="team-reply-change">
          <strong>{team!.title}</strong>
          <p>{review.message}</p>
          <b>
            {confirmedTeamSize(team!)} 人 → {confirmedTeamSize(review.nextTeam)}{" "}
            人<span> / 上限 {team!.capacity} 人</span>
          </b>
        </div>
      )}
      <p className="team-relay-note">
        这是朋友手动发送的信息，未验证身份。请核对昵称与意向；只有点击确认，才会写入此浏览器。
      </p>
      <div className="team-relay-actions">
        <button type="button" className="outline" onClick={onCancel}>
          {review?.ok && review.kind === "duplicate" ? "知道了" : "先不导入"}
        </button>
        {review?.ok && review.kind !== "duplicate" && (
          <button
            type="button"
            className="primary"
            onClick={() => onConfirm(reply)}
          >
            确认
            {reply.member.status === "confirmed"
              ? "导入参加回执"
              : "导入撤回回执"}
          </button>
        )}
      </div>
    </div>
  );
}
