import {
  BriefcaseBusiness,
  CalendarDays,
  Globe,
  Link,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  UserRound,
} from "lucide-react";
import { birthdayDisplay, formatDate } from "@resume/editor-config";
import type { Resume } from "@resume/model";

export default function Identity({ resume }: { resume: Resume }) {
  const p = resume.profile;
  const contactRows = [
    [
      { label: "电话", value: p.phone, icon: Phone },
      { label: "邮箱", value: p.email, icon: Mail },
      { label: "城市", value: p.location, icon: MapPin },
    ],
    [
      { label: "网站", value: p.website, icon: Globe },
      { label: "微信", value: p.wechat, icon: MessageCircle },
      { label: "LinkedIn", value: p.linkedin, icon: Link },
    ],
    [
      {
        label: p.birthdayMode === "age" ? "年龄" : "生日",
        value: formatDate(birthdayDisplay(p.birthday || "", p.birthdayMode), resume.style.dateFormat),
        icon: CalendarDays,
      },
      { label: "性别", value: p.gender, icon: UserRound },
      { label: "民族", value: p.ethnic, icon: UserRound },
      { label: "政治面貌", value: p.politicalStatus, icon: UserRound },
    ],
    [
      ...(["height", "weight", "hometown", "maritalStatus", "zodiac", "mbti"] as const).map((key, i) => ({
        label: ["身高", "体重", "籍贯", "婚姻状况", "星座", "MBTI"][i],
        value: p[key],
        icon: UserRound,
      })),
    ],
    [
      { label: "求职意向", value: p.role, icon: BriefcaseBusiness },
      { label: "当前状态", value: p.employmentStatus, icon: BriefcaseBusiness },
      { label: "意向城市", value: p.expectedCity, icon: MapPin },
      { label: "期望薪资", value: p.expectedSalary, icon: BriefcaseBusiness },
    ],
  ]
    .map((row) => row.filter((item) => item.value))
    .filter((row) => row.length > 0);
  return (
    <div className="resume-unit resume-identity" data-section="profile" data-keep="next">
      {p.avatar && <img className="resume-avatar" src={p.avatar} alt="" />}
      <div className="identity-main">
        <div className="resume-name">{p.name || "你的姓名"}</div>
      </div>
      {contactRows.length > 0 && (
        <div className="resume-contact">
          {contactRows.map((row) => (
            <div className="contact-row" key={row[0].label}>
              {row.map(({ label, value, icon: Icon }) => (
                <span className={`contact-item${label === "求职意向" ? " resume-role" : ""}`} key={label}>
                  <Icon className="contact-icon" size={11} />
                  <span className="contact-label">{label}</span>
                  <span className="contact-value">{value}</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
