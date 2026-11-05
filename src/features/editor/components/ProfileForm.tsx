import { ImagePlus, Sparkles, X } from "lucide-react";
import { type ChangeEvent } from "react";
import { profileFieldGroups } from "@resume/editor-config";
import { type Resume } from "@resume/model";
import DateField from "@/shared/ui/DateField";
import { Disclosure, Field, IconButton, SelectField, TextArea, UISelect } from "@/shared/ui";

interface Props {
  resume: Resume;
  profile: (key: keyof Resume["profile"], value: string) => void;
  uploadAvatar: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
}
export default function ProfileForm({ resume, profile, uploadAvatar }: Props) {
  return (
    <>
      <div className="profile-photo-row">
        <div>
          <h3>你的职业名片</h3>
          <p>清晰的信息，是好印象的开始</p>
        </div>
        <div className="profile-photo">
          <label className="photo-upload" title={resume.profile.avatar ? "更换证件照" : "添加证件照"}>
            {resume.profile.avatar ? (
              <img src={resume.profile.avatar} alt="证件照" />
            ) : (
              <>
                <ImagePlus size={20} />
                <span>添加照片</span>
              </>
            )}
            <input
              type="file"
              aria-label={resume.profile.avatar ? "更换证件照" : "添加证件照"}
              accept="image/png,image/jpeg,image/webp"
              onChange={uploadAvatar}
            />
          </label>
          {resume.profile.avatar && (
            <IconButton className="photo-remove" title="移除照片" onClick={() => profile("avatar", "")}>
              <X size={14} aria-hidden="true" />
            </IconButton>
          )}
        </div>
      </div>
      <div className="field-grid">
        <Field label="姓名" value={resume.profile.name} onChange={(v) => profile("name", v)} />
        <Field label="求职意向" value={resume.profile.role} onChange={(v) => profile("role", v)} />
        <Field label="手机号码" value={resume.profile.phone} onChange={(v) => profile("phone", v)} />
        <Field label="电子邮箱" value={resume.profile.email} onChange={(v) => profile("email", v)} />
        <Field label="所在城市" value={resume.profile.location} onChange={(v) => profile("location", v)} />
        <Field
          label="个人网站"
          value={resume.profile.website}
          onChange={(v) => profile("website", v)}
          placeholder="网站 / 作品集链接"
        />
        <label className="field wide">
          <span>
            个人简介 <small>选填</small>
          </span>
          <TextArea
            rows={4}
            value={resume.profile.summary}
            onChange={(e) => profile("summary", e.target.value)}
            placeholder="用 2–3 句话，介绍你的经验、优势与方向"
          />
        </label>
      </div>
      {profileFieldGroups.map((group) => (
        <Disclosure className="profile-details" key={group.title} title={group.title}>
          <div className="field-grid">
            {group.fields.map((field) =>
              field.options ? (
                <SelectField
                  key={field.key}
                  label={field.label}
                  value={resume.profile[field.key] || ""}
                  options={field.options}
                  onChange={(value) => profile(field.key, value)}
                />
              ) : field.key === "birthday" ? (
                <DateField
                  key={field.key}
                  label={field.label}
                  value={resume.profile.birthday || ""}
                  onChange={(value) => profile("birthday", value)}
                />
              ) : (
                <Field
                  key={field.key}
                  label={field.label}
                  placeholder={field.placeholder}
                  value={resume.profile[field.key] || ""}
                  onChange={(value) => profile(field.key, value)}
                />
              ),
            )}
          </div>
          {group.fields.some((field) => field.key === "birthday") && (
            <label className="field">
              <span>年龄或生日</span>
              <UISelect
                label="年龄或生日"
                value={resume.profile.birthdayMode || "birthday"}
                onChange={(value) => profile("birthdayMode", value)}
                options={[
                  ["birthday", "显示生日"],
                  ["age", "显示年龄"],
                ]}
              />
            </label>
          )}
        </Disclosure>
      ))}
      <div className="writing-tip">
        <Sparkles size={14} />
        <span>一句话说清你的经验，用一个成果说明你的价值。</span>
      </div>
    </>
  );
}
