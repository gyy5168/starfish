# 【Starfish】不能修改，短信服务商会验证这个前缀，否则短信发送不成功
validate_phone_sms_template = """【比特兄弟】Starfish验证码：{token}，30分钟内有效。为了您的账号安全，请勿告知他人。
"""

# 【Starfish】不能修改，短信服务商会验证这个前缀，否则短信发送不成功
reset_password_sms_template = """【比特兄弟】Starfish验证码：{token}，30分钟内有效。为了您的账号安全，请勿告知他人。
"""

email_invitation_template = """
<html>
<head>
    <meta charset="utf-8">
</head>
<body>
    <div>
        <p style="text-align: center;">【%s】正在使用 Starfish 办公系统，管理员%s邀请你加入。</p>
        <div style="text-align: center;">
            <a style="display: inline-block; padding: 9px 30px; font-size: 14px; font-weight: bold; text-align: center; cursor: pointer; border: 1px solid transparent;  border-radius: 4px; color: #fff; background-color: #428bca; border-color: #357ebd;  text-decoration: none;" href="%s">点击这里进入</a>
        </div>
    </div>
</body>
</html>
"""

# 【Starfish】不能修改，短信服务商会验证这个前缀，否则短信发送不成功
sms_invitation_template = """【Starfish】管理员%s邀请您加入%s，立即行动：%s 回T退订
"""
