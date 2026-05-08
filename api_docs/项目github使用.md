在 Windows 系统中配置 GitHub SSH，整体流程分为四步：生成密钥 → 添加到 SSH Agent → 上传公钥到 GitHub → 验证连接。下面逐步拆解 👇

---

## 🔑 第一步：生成 SSH 密钥对

打开 **Git Bash**（推荐）或 Windows Terminal（就是cmd），执行以下命令：

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

> 💡 `-t ed25519` 是目前推荐的加密算法，比旧版 RSA 更安全、更快。
> 邮箱替换为你的 **GitHub 注册邮箱**。

执行后会出现三个提示：

```
Enter file in which to save the key:   # 直接回车，使用默认路径
Enter passphrase:                       # 可设置密码短语（推荐），或直接回车跳过
Enter same passphrase again:            # 再次确认
```

生成完成后，密钥默认保存在：
- 私钥：`C:\Users\你的用户名\.ssh\id_ed25519`
- 公钥：`C:\Users\你的用户名\.ssh\id_ed25519.pub`

---

## ⚙️ 第二步：将私钥添加到 SSH Agent

首先确保 SSH Agent 服务已启动（以管理员身份运行 PowerShell）：

```powershell
# 设置 SSH Agent 为自动启动
Set-Service -Name ssh-agent -StartupType Automatic
# 启动服务
Start-Service ssh-agent
```

然后在 **Git Bash** 中添加私钥：

```bash
ssh-add C:\Users\你的用户名\.ssh\id_ed25519
```

验证是否添加成功：

```bash
ssh-add -l
```

---

## ☁️ 第三步：将公钥上传到 GitHub

**1. 复制公钥内容**

在 Git Bash 中执行：

```bash
cat ~/.ssh/id_ed25519.pub
```

复制输出的全部内容（以 `ssh-ed25519` 开头）。

**2. 添加到 GitHub**

- 登录 GitHub → 点击右上角头像 → **Settings**
- 左侧菜单选择 **SSH and GPG keys**
- 点击 **New SSH key**
- 填写 **Title**（随意，如 `My Windows PC`）
- 将复制的公钥粘贴到 **Key** 输入框
- 点击 **Add SSH key** 确认

---

## ✅ 第四步：验证连接

在 Git Bash 中执行：

```bash
ssh -T git@github.com
```

首次连接会提示是否信任主机，输入 `yes` 回车。

成功时输出：

```
Hi your_username! You've successfully authenticated, but GitHub does not provide shell access.
```

---

## 📋 常用场景速查

| 场景                    | 操作                                                         |
| ----------------------- | ------------------------------------------------------------ |
| 克隆仓库                | `git clone git@github.com:用户名/仓库名.git`                 |
| 已有 HTTPS 仓库改为 SSH | `git remote set-url origin git@github.com:用户名/仓库名.git` |
| 查看当前远程地址        | `git remote -v`                                              |
| 多账号配置              | 编辑 `~/.ssh/config` 文件区分 Host                           |

---

## 🛠️ 常见问题排查

- **`ssh-add` 报错 "Could not open a connection"** → SSH Agent 未启动，重新执行第二步的 PowerShell 命令
- **权限被拒绝 (Permission denied)** → 检查公钥是否正确上传，或私钥路径是否匹配
- **每次重启后需要重新 `ssh-add`** → 确认 `ssh-agent` 服务已设置为**自动启动**

配置完成后，所有 `git push` / `git pull` 操作都将通过 SSH 免密进行，体验非常流畅 🚀