说明

* 所有 HTTP 请求响应均为 JSON，UTF-8 编码，需指定 header：

    ```javascript
    Content-type: application/json
    Accept: application/json
    ```

* 请求响应示例：

    成功：

    ```javascript
    {
        "errcode": 0,
        "errmsg": "OK"
    }
    ```

    失败：

    ```javascript
    {
        "errcode": 123,
        "errmsg": "some message"
    }
    ```

    附带数据：

    ```javascript
    {"errcode": 0, "errmsg": "OK", "data": [{"task1", ...}, {"task2", ...}]}
    ```

    附带自动登陆信息：

    ```javascript
    {"errcode": 0,
     "errmsg": "OK",
     "data": [{"task1", ...}, {"task2", ...}],
     "extra": {
         "remember_token": "rn9l61cyacna4tffff12k7kk",
         "session_key": "lbfpvmjtl6y5p0epwna6j7652dechjvv",
         "user_id": 1
     }
    }
    ```

* 获取用户信息的 API 都需要登陆并且有权限（用户在该组织）访问，否则会返回错误：

    ```javascript
    {
        "errcode": 3,
        "errmsg": "you need sign in"
    }
    ```

    ```javascript
    {
        "errcode": 4,
        "errmsg": "permission denied"
    }
    ```

    后面示例不一一说明

* 以下示例省略请求前缀：https://api.starfish.im/v1

* 以下示例省略请求的公共返回信息：errcode，errmsg，extra。

* 部分 API 有 Last-Modified 支持，关于 Last-Modified 可以参考：http://www.cyberciti.biz/faq/linux-unix-curl-if-modified-since-command-linux-example/
客户端在发 HTTP 请求时，带上 If-Modified-Since 头，服务器会根据这个时间戳来返回：

    ##### 1）如果客户端内容不是最新的，则返回 200 OK + 正常返回内容 或者

    ##### 2）如果客户端内容是最新的，则返回 304 Not Modified 和空 body

# 账户

## 常量定义

* GENDER_MALE = 0
* GENDER_FEMALE = 1
* GENDER_UNKNOWN = 2

## 用户注册

```javascript
NORMAL API: POST /users
```

__参数：__

```javascript
{
  "gender": 1,
  "is_auto_login": 0,
  "name": "your-name",
  "password": "foobar",
  "phone": "9527",
  "token": "9528"
}
```


__注：token 是手机号通过验证得到的验证码，获取 token 的方法见：创建 Token。
is_auto_login=1， 注册成功后直接登录并返回登录信息。__

__返回：__
is_auto_login=0

```javascript
{
  "avatar": "https://api.starfish.im/v1/user-avatars/1/2014-03-21/77/a.jpg",
  "formatted_phone": "+86 9527",
  "gender": 1,
  "id": 1,
  "intro": "lilei",
  "name": "lilei",
  "phone": "9527"
}
```
is_auto_login=1：
返回值同“用户登陆”接口。

__注：该 API 可以上传一个头像文件，此时不能用 JSON 编码，Content-Type 必须是 multipart/form-data，如果不上传头像，Content-Type 必须是 application/json。__

## 获取用户摘要

```javascript
NORMAL API: GET /user_summaries/:user_id1[,:user_id2,:user_id3,......]
```

__返回：__

```javascript
[
  {
    "avatar": "https://api.starfish.im/v1/user-avatars/1/2014-03-21/77/a.jpg",
    "gender": 1,
    "id": 1,
    "intro": "lilei",
    "name": "lilei",
    "phone": "9527"
  }
]
```

## 获取用户详情

```javascript
NORMAL API: GET /users/:user_id1[,:user_id2,:user_id3,......]
```

__返回：__

```javascript
[
  {
    "avatar": "https://api.starfish.im/v1/user-avatars/1/2014-03-21/77/a.jpg",
    "distance": 1453,
    "gender": 1,
    "id": 1,
    "intro": "lilei",
    "location": "wuhan",
    "name": "lilei",
    "online": true,
    "phone": "9527"
  }
]
```

## 获取当前登录用户详情

```javascript
NORMAL API: GET /users/self
```

__返回：__

```javascript
{
  "avatar": "https://api.starfish.im/v1/user-avatars/1/2014-03-21/77/a.jpg",
  "gender": 1,
  "id": 1,
  "intro": "lilei",
  "is_admin": 1,
  "last_org": {
    "api_url": "https://api.starfish.im/v1",
    "avatar": "https://api.starfish.im/v1/org-avatars/1/",
    "bfs_url": "bfs.starfish.im",
    "creator": 4,
    "creator_info": {
      "avatar": "...",
      "id": 4,
      "name": "Steve",
      "order_field": 2085161728
    },
    "domain": "b.starfish.im",
    "id": 1,
    "intro": "bitbrothers",
    "name": "bitbrothers"
  },
  "name": "lilei",
  "phone": "9527"
}
```

## 检索用户

```javascript
NORMAL API: GET /users
```

__参数：__

* 根据手机号检索用户 phone=:phone

* 根据密码检索用户 password=:password，此 API 用于验证当前登陆用户密码的正确性。

* 根据微信 openid 检索用户 openid=:openid

__返回：__

```javascript
{
  "avatar": "https://api.starfish.im/v1/user-avatars/1/2014-03-21/77/a.jpg",
  "gender": 1,
  "id": 1,
  "intro": "lilei",
  "name": "lilei",
  "phone": "9527"
}
```

## 更新用户信息

```javascript
NORMAL API: PATCH /users/:user_id
```

__参数：__

```javascript
{
  "default_avatar": 1,
  "gender": 1,
  "intro": "hello simon",
  "latitude": 31.987935,
  "longitude": 118.747933,
  "name": "simon",
  "password": "foobar",
  "phone": "9527",
  "phone-token": "9528"
}
```

__注：要修改手机号码，需要提供 password 做验证，修改其他字段无需验证。__
__注：该 API 可以更新用户头像，字段名：avatar，头像文件以附件形式上传，此时请求编码格式为：multipart/form-data。__
__注：default_avatar=1，将恢复为系统默认头像。__

## 通过 Token 重置密码（第一步）

__创建 Token__

__参数：__

// 根据手机号来重置密码

```javascript
{
  "phone": "12132312",
  "type": 1
}
```

## 通过 Token 重置密码（第二步）

```javascript
NORMAL API: PATCH /users/self
```

__参数：__

```javascript
{
  "password": "foobar",
  "token": "9527"
}
```

## 提供原始密码重置密码

```javascript
NORMAL API: PATCH /users/self
```

__参数：__

```javascript
{
  "original-password": "foobar",
  "password": "new foobar"
}
```

__注：访问此 API 需要用户登陆。__

## 删除指定用户

```javascript
NORMAL API: DELETE /users/:user_id
```

## 获取指定用户的设备列表

```javascript
NORMAL API: GET /users/:user_id/agents
```

设备类型

* ANDROID = 1
* IPHONE = 2
* WINDOWS = 7
* MACOSX = 8
* LINUX = 9
* BROWSER = 10

__返回：__

```javascript
[
  {
    "desc": "alice iphone",
    "key": "c7b4b54f8dac7cf66e732924964a53f2",
    "type": 10
  }
]
```

## 删除指定用户的设备

```javascript
NORMAL API: DELETE /users/:user_id/agents/:agent_key
```

## 指定用户的设备离线

```javascript
NORMAL API: PATCH /users/:user_id/agents/:agent_key
```

__参数：__

```javascript
{
  "online": false
}
```

## 用户登陆

```javascript
NORMAL API: POST /sessions
```

__参数：__

// 用户名密码登陆，记住密码

```javascript
{
  "auto_signin": 1,
  "device_id": "356489051607096",
  "password": "foobar95275",
  "phone": "9527",
  "remember": 1
}
```

// 记住密码自动登陆

```javascript
{
  "remember_token": "rn9l61cyacna4tffff12k7kk"
}
```

__注：登陆可以传用户名 + 密码，remember 字段可选， remember 字段没有就是不记住；也可以只传remember_token（不需要传phone, password 等），记住remember_token 每次都会变，登陆后要保存起来。__

__注：remember me 设计：http://stackoverflow.com/questions/244882/what-is-the-best-way-to-implement-remember-me-for-a-website__

__注：cookies 中的 session_id 由两部分构成：user_id 和 session_key，这么设计是为了支持获取用户当前登陆的设备。__

__注：pull_messages = 0/1，表示是否需要主动拉取所有会话消息。__

__返回：__

```javascript
{
  "bfs_url": "bfs.starfish.im",
  "maxwell_endpoint": "tcp://182.92.98.136:2013",
  "pull_messages": 1,
  "remember_token": "uxb4a782rg4cxq37mlt091i6",
  "session_key": "0dz2h6tr1vp0kphoipzb15e1olkqzmzn",
  "sip": {
    "name": 2,
    "password": "3tfSIvG58jNk1PTPKA89vld3xmL68AA7mUJSpA1pwzztblLMq5GdMssTIj5LY9oK",
    "proxy_server": "123.57.59.182",
    "registrar": "123.57.59.182"
  },
  "stun": {
    "server": "123.57.59.182"
  },
  "turn": {
    "password": "",
    "server": "123.57.59.182",
    "username": ""
  },
  "user_id": 2
}
```

## 用户登出

```javascript
NORMAL API: DELETE /sessions/self
```


## 创建 Token

```javascript
NORMAL API: POST /tokens
```

__参数：__

// 验证手机号合法性；

```javascript
{
  "phone": "12222222312",
  "type": 0
}
```

// 通过手机重置密码；

```javascript
{
  "phone": "12312222222",
  "type": 1
}
```

__注：重置密码、验证手机号码合法性合法性依赖这个 API。__

## 搜索 Token

```javascript
NORMAL API: GET /tokens?type=0&account=:phone&token=:token&is_auto_login=0 // 验证手机号合法性
NORMAL API: GET /tokens?type=1&account=:phone&token=:token // 通过手机重置密码
```

__如果能搜索到合法 token：__
is_auto_login=0， 则返回

```javascript
{
  "account": "13800000001",
  "token": "9527",
  "user_id": 0
}
```
is_auto_login=1， 则返回值同“用户登录”接口。

__如果不能搜索到合法 token，则返回：__

```javascript
null
```

## 获取用户识别码

```javascript
NORMAL API: GET /validate-code-avatars?generated_key=:generated_key
```

__参数：__
generated_key： 客户端提供一个8-32长度的随机字符串（支持字母、数字、符号）
如果客户端不提供generated_key参数，可以从返回的cookie中读取generated_key字段。


__返回：__
用户识别码图片，验证有效期30分钟。


## 验证用户识别码

```javascript
NORMAL API: GET /validate-code-validate?generated_key=:generated_key&code=:code
```

__参数：__
generated_key：同获取识别码时提供的参数
code：用户输入的识别码。 （不区分大小写）


__返回：__
is_valid：1=验证成功；0=验证失败。
无论返回成功或失败，验证一次该识别码即刻失效。
```javascript
{
  "is_valid": 1
}
```


# 组织

## 新建组织

```javascript
NORMAL API: POST /orgs
```

__参数：__

```javascript
{
  "category": "C1-C2-C3",
  "city": "Hangzhou",
  "domain": "ibm.starfish.im",
  "intro": "intro",
  "invitation_code": "57djft",
  "name": "ibm",
  "province": "Zhejiang"
}
```

__返回：__

```javascript
{
  "avatar": "https://api.starfish.im/v1/org-avatars/1/",
  "category": "C1-C2-C3",
  "city": "Hangzhou",
  "creator": 4,
  "creator_info": {
    "avatar": "...",
    "id": 4,
    "name": "Steve",
    "order_field": 2085161728
  },
  "domain": "b.starfish.im",
  "id": 1,
  "intro": "bitbrothers",
  "name": "bitbrothers",
  "province": "Zhejiang"
}
```

__注：创建组织的时候可以上传组织头像，字段名：avatar，头像文件以附件形式上传，此时请求编码格式为：multipart/form-data。__

## 更新组织信息

```javascript
ORG API: PATCH /orgs/:org_id
```

__参数：__

```javascript
{
  "category": "C1-C2-C3",
  "city": "Hangzhou",
  "intro": "hello moto",
  "name": "ibm123",
  "province": "Zhejiang"
}
```

__注：该 API 可以更新组织头像，字段名：avatar，头像文件以附件形式上传，此时请求编码格式为：multipart/form-data。__

__返回：__

```javascript
{
  "avatar": "http://zhanweitu.com/100/100/avatar",
  "category": "C1-C2-C3",
  "city": "Hangzhou",
  "creator": 1,
  "creator_info": {
    "avatar": "...",
    "id": 1,
    "name": "Steve",
    "order_field": 2085161728
  },
  "domain": "ibm.starfish.im",
  "id": 1,
  "intro": "hello moto",
  "name": "ibm123",
  "province": "Zhejiang"
}
```

## 获取组织详情

```javascript
ORG API: GET /orgs/:org_id
```

__返回：__

```javascript
{
  "avatar": "https://api.starfish.im/v1/org-avatars/1/",
  "category": "C1-C2-C3",
  "city": "Hangzhou",
  "creator": 4,
  "creator_info": {
    "avatar": "...",
    "id": 4,
    "name": "Steve",
    "order_field": 2085161728
  },
  "domain": "b.starfish.im",
  "id": 1,
  "intro": "bitbrothers",
  "name": "bitbrothers",
  "order_field": 2085161728,
  "province": "Zhejiang"
}
```

## 获取组织状态

```javascript
NORMAL API: GET /orgs/status
```

__返回：__

```javascript
{
  "1": {
    "has_unread_messages": 1,
    "unread_messages_count": 10
  },
  "2": {
    "has_unread_messages": 0,
    "unread_messages_count": 0
  }
}
```

## 获取所有消息未读数目

```javascript
NORMAL API: GET /users/:user_id/messages/all_unread_count
```

__返回：__

```javascript
{
  "1": 0,
  "2": 0,
  "global": 0,
  "total": 0
}
```

## 添加组织域名

```javascript
ORG API: POST /orgs/:org_id/domains
```

__参数：__

```javascript
{
  "is_default": 0,
  "name": "ibm.starfish.im"
}
```

__返回：__

```javascript
{
  "id": 5,
  "is_default": 0,
  "name": "ibm.starfish.im"
}
```

## 获取组织域名列表

```javascript
ORG API: GET /orgs/:org_id/domains
```

__返回：__

```javascript
[
  {
    "id": 5,
    "is_default": 1,
    "name": "bit.test.com"
  },
  {
    "id": 3,
    "is_default": 0,
    "name": "ibm.starfish.im"
  },
  {
    "id": 4,
    "is_default": 0,
    "name": "starfish.im"
  }
]
```


## 更改组织域名

```javascript
ORG API: PATCH /orgs/:org_id/domains/:domain_id
```

__参数：__

```javascript
{
  "is_default": 1,
  "name": "ibm.starfish.im"
}
```

__返回：__

```javascript
{
  "id": 5,
  "is_default": 1,
  "name": "ibm.starfish.im"
}
```

## 删除组织域名

```javascript
ORG API: DELETE /orgs/:org_id/domains/:domain_id
```


## 获取指定用户的组织信息

```javascript
NORMAL API: GET /users/:user_id/orgs
```

__返回：__

```javascript
[
  {
    "api_url": "https://api.starfish.im/v1",
    "bfs_url": "bfs.starfish.im",
    "category": "C1-C2-C3",
    "city": "Hangzhou",
    "creator": 1,
    "creator_info": {
      "avatar": "...",
      "id": 1,
      "name": "Steve",
      "order_field": 2085161728
    },
    "domain": "ibm.starfish.im",
    "id": 1,
    "intro": "",
    "name": "ibm",
    "province": "Zhejiang"
  }
]
```

## 获取指定具有管理权限的组织信息

```javascript
NORMAL API: GET /user-admins/:user_id
```

__返回：__

```javascript
[
  {
    "api_url": "https://api.starfish.im/v1",
    "bfs_url": "bfs.starfish.im",
    "category": "C1-C2-C3",
    "city": "Hangzhou",
    "creator": 1,
    "creator_info": {
      "avatar": "...",
      "id": 1,
      "name": "Steve",
      "order_field": 2085161728
    },
    "domain": "ibm.starfish.im",
    "id": 1,
    "intro": "",
    "name": "ibm",
    "province": "Zhejiang"
  }
]
```

## 更新指定用户的最后使用组织

```javascript
NORMAL API: PATCH /users/:user_id/orgs/last
```

__参数：__

```javascript
{
  "org_id": 1
}
```

## 获取组织内成员列表

```javascript
ORG API: GET /orgs/:org_id/members
```

__返回：__

```javascript
{
  "left": [
    {
      "departments": [
        "R&D"
      ],
      "domain_id": 5,
      "id": 1,
      "local_part": "alice",
      "position": "engineer",
      "work_mail": "alice@starfish.im"
    }
  ],
  "normal": [
    {
      "departments": [
        "R&D",
        "PRODUCT"
      ],
      "domain_id": 5,
      "id": 2,
      "local_part": "bob",
      "position": "engineer",
      "work_mail": "bob@starfish.im"
    }
  ]
}
```

## 创建组织邀请计数

```javascript
ORG API: POST /orgs/:org_id/org_invitation
```

__参数：__
limit=0, 不设置上限人数。

```javascript
{
  "type": "phone",
  "org_id": 1,
  "limit": 0
}
```

__返回：__

```javascript
{
  "added": 1,
  "creator": 133,
  "creator_info": {
    "avatar": "https://api.starfish.im/v1/user-avatars/133/0/2015-08-18/86048298/f.bbgen",
    "id": 133,
    "name": "quyilin",
    "order_field": 1903524201
  },
  "id": 2,
  "is_valid": 1,
  "limit": 0,
  "org": {
    "avatar": "https://api.starfish.im/v1/org-avatars/1/0/2015-06-09/52098416/f.jpg",
    "id": 1,
    "intro": "hello moto",
    "name": "zte"
  },
  "org_id": 1
}
```

## 获取组织邀请计数

```javascript
ORG API: GET /orgs:/org_id/org_invitation
```

__返回：__

```javascript
{
  "added": 1,
  "creator": 133,
  "creator_info": {
    "avatar": "https://api.starfish.im/v1/user-avatars/133/0/2015-08-18/86048298/f.bbgen",
    "id": 133,
    "name": "quyilin",
    "order_field": 1903524201
  },
  "id": 2,
  "is_valid": 1,
  "limit": 0,
  "org": {
    "avatar": "https://api.starfish.im/v1/org-avatars/1/0/2015-06-09/52098416/f.jpg",
    "id": 1,
    "intro": "hello moto",
    "name": "zte"
  },
  "type": "phone",
  "org_id": 1
}
```

## 删除组织邀请计数

```javascript
ORG API: DELETE /orgs:/org_id/org_invitation/:org_invitation_id
```

## 获取组织邀请计数详情

```javascript
NORMAL API: GET /org_invitation/:invitation_id?org_id=:org_id&type=:type
```

__返回：__

```javascript
{
  "added": 1,
  "creator": 133,
  "creator_info": {
    "avatar": "https://api.starfish.im/v1/user-avatars/133/0/2015-08-18/86048298/f.bbgen",
    "id": 133,
    "name": "quyilin",
    "order_field": 1903524201
  },
  "id": 2,
  "is_valid": 1,
  "limit": 0,
  "org": {
    "avatar": "https://api.starfish.im/v1/org-avatars/1/0/2015-06-09/52098416/f.jpg",
    "id": 1,
    "intro": "hello moto",
    "name": "zte"
  },
  "type": "phone",
  "org_id": 1
}
```

## 通过邀请成员加入组织

```javascript
NORMAL API: POST /org_invitation/user
```

__参数：__
```javascript
{
  "org_id": 1,
  "invitation_id": 1,

  "gender": 1,
  "is_auto_login": 0,
  "name": "your-name",
  "password": "foobar",
  "phone": "9527",
  "token": "9528"
}
```

__返回：__

```javascript
{
  "is_added": 1
}
```


# 组织成员

## 获取成员信息

```javascript
ORG API: GET /orgs/:org_id/members/:user_id1[,:user_id2...]
```

__参数：__

```javascript
{
  "1": {
    "departments": [
      "R&D",
      "PRODUCT"
    ],
    "domain_id": 5,
    "id": 2,
    "is_left": 0,
    "local_part": "bob",
    "position": "engineer",
    "work_mail": "bob@starfish.im"
  },
  "2": {
    "departments": [
      "R&D"
    ],
    "domain_id": 5,
    "id": 1,
    "is_left": 1,
    "local_part": "alice",
    "position": "engineer",
    "work_mail": "alice@starfish.im"
  }
}
```

## 修改成员信息

```javascript
ORG API: PATCH /orgs/:org_id/members/:user_id
```

__参数：__

```javascript
{
  "domain_id": 5,
  "position": "engineer",
  "work_mail_local_part": "alice"
}
```

## 检查 work mail local part 是否可用

```javascript
ORG API: GET /orgs/:org_id/work_mails?local_part=:local_part
```

__返回：如果已经被使用，则返回 user_id/group_id，否则返回 null。__


## 获取 work mail 列表

* TYPE_ORG_MEMBER = 0
* TYPE_DEPARTMENT = 1
* TYPE_DISCUSSION_GROUP = 2

```javascript
ORG API: GET /orgs/:org_id/work_mails?owner_type=:owner_type&is_set=1
```

__参数：__
owner_type 如列表示，必填。
is_set=1，已设置列表；is_set=0,未设置列表。


__返回：__
```javascript
[
  {
    "domain_id": 1,
    "is_set": 1,
    "local_part": "steve",
    "owner_info": {
      "avatar": "...",
      "id": 1,
      "name": "Steve"
    },
    "owner_type": 0
  },
  {
    "domain_id": 1,
    "is_set": 1,
    "local_part": "bob",
    "owner_info": {
      "avatar": "...",
      "id": 2,
      "name": "Bob"
    },
    "owner_type": 0
  }
]
```


## 批量修改成员邮件地址

```javascript
ORG API: PATCH /orgs/:org_id/members
```

__参数：__

```javascript
[
  {
    "domain_id": 5,
    "user_id": 4,
    "work_mail_local_part": "alice"
  },
  {
    "domain_id": 5,
    "user_id": 6,
    "work_mail_local_part": "b--(*!)ob"
  },
  {
    "domain_id": 5,
    "user_id": 7,
    "work_mail_local_part": "bob"
  }
]
```

__返回：__

```javascript
[
  {
    "errcode": 0,
    "id": 100
  },
  {
    "domain_id": 5,
    "errcode": 57,
    "local_part": "b--(*!)ob"
  },
  {
    "domain_id": 5,
    "errcode": 24,
    "local_part": "bob"
  }
]
```

## 将成员移除组织

```javascript
ORG API: DELETE /orgs/:org_id/members/:member_id1[,:member_id2,:member_id3,......]
```

# 讨论组

## 新建讨论组

```javascript
ORG API: POST /orgs/:org_id/discussion_groups
```

__参数：__
name: 可选，不带name或name为空，讨论组将使用默认名字。

```javascript
{
  "departments": [
    51,
    52
  ],
  "exclude_departments": [
    2
  ],
  "exclude_members": [
    9,
    10
  ],
  "intro": "intro",
  "members": [
    1,
    2,
    3
  ],
  "name": "group name"
}
```

__返回：__

```javascript
{
  "avatar": "https://api.starfish.im/v1/discussion-group-avatars/1/29/",
  "creator": 4,
  "creator_info": {
    "avatar": "...",
    "id": 4,
    "name": "Steve",
    "order_field": 2085161728
  },
  "id": 29,
  "intro": "moto",
  "is_disbanded": 0,
  "name": "hello",
  "related_project_id": 1
}
```

## 获取指定组织成员的讨论组

```javascript
ORG API: GET /orgs/:org_id/members/:member_id/discussion_groups
```

__返回：__

```javascript
{
  "disbanded": [
    {
      "avatar": "http://zhanweitu.com/100/100/avatar",
      "creator": 1,
      "creator_info": {
        "avatar": "...",
        "id": 1,
        "name": "Steve",
        "order_field": 2085161728
      },
      "id": 2,
      "intro": "",
      "is_disbanded": 1,
      "name": "",
      "related_project_id": 1
    }
  ],
  "left": [
    {
      "avatar": "http://zhanweitu.com/100/100/avatar",
      "creator": 1,
      "creator_info": {
        "avatar": "...",
        "id": 1,
        "name": "Steve",
        "order_field": 2085161728
      },
      "id": 3,
      "intro": "",
      "is_disbanded": 0,
      "name": "",
      "related_project_id": 1
    }
  ],
  "normal": [
    {
      "avatar": "http://zhanweitu.com/100/100/avatar",
      "creator": 1,
      "creator_info": {
        "avatar": "...",
        "id": 1,
        "name": "Steve",
        "order_field": 2085161728
      },
      "id": 1,
      "intro": "",
      "is_disbanded": 0,
      "name": "",
      "related_project_id": 1
    }
  ]
}
```

## 获取指定组织成员的(正常)讨论组

```javascript
ORG API: GET /orgs/:org_id/members/:member_id/discussion_groups?normal=1&page=1&count=10
```
__参数：__
normal=1, 只返回正常讨论组。
page=1，count=10，返回第page页的count条数据。

__返回：__

```javascript
[
  {
    "avatar": "http://zhanweitu.com/100/100/avatar",
    "creator": 1,
    "creator_info": {
      "avatar": "...",
      "id": 1,
      "name": "Steve",
      "order_field": 2085161728
    },
    "id": 2,
    "intro": "",
    "is_disbanded": 0,
    "name": "",
    "related_project_id": 1
  },
  {
    "avatar": "http://zhanweitu.com/100/100/avatar",
    "creator": 1,
    "creator_info": {
      "avatar": "...",
      "id": 1,
      "name": "Steve",
      "order_field": 2085161728
    },
    "id": 3,
    "intro": "",
    "is_disbanded": 0,
    "name": "",
    "related_project_id": 1
  },
  {
    "avatar": "http://zhanweitu.com/100/100/avatar",
    "creator": 1,
    "creator_info": {
      "avatar": "...",
      "id": 1,
      "name": "Steve",
      "order_field": 2085161728
    },
    "id": 1,
    "intro": "",
    "is_disbanded": 0,
    "name": "",
    "related_project_id": 1
  }
]
```

## 更新讨论组信息

```javascript
ORG API: PATCH /orgs/:org_id/discussion_groups/:group_id
```

__参数：__

```javascript
{
  "domain_id": 5,
  "intro": "hello moto",
  "name": "rd123",
  "work_mail_local_part": "rd"
}
```

__返回：__

```javascript
[
  {
    "avatar": "http://zhanweitu.com/100/100/avatar",
    "creator": 1,
    "creator_info": {
      "avatar": "...",
      "id": 1,
      "name": "Steve",
      "order_field": 2085161728
    },
    "id": 1,
    "intro": "",
    "is_disbanded": 0,
    "name": "",
    "work_mail": "rd@starfish.im"
  }
]
```

__注：该 API 可以更新讨论组头像，字段名：avatar，头像文件以附件形式上传，此时请求编码格式为：multipart/form-data。__


## 批量修改讨论组邮件地址

```javascript
ORG API: PATCH /orgs/:org_id/discussion_groups
```

__参数：__

```javascript
[
  {
    "domain_id": 5,
    "group_id": 4,
    "work_mail_local_part": "ios-prj"
  }
]
```

## 获取讨论组详情

```javascript
ORG API: GET /orgs/:org_id/discussion_groups/:group_id
```

__返回：__

```javascript
{
  "creator": 1,
  "creator_info": {
    "avatar": "...",
    "id": 1,
    "name": "Steve",
    "order_field": 2085161728
  },
  "id": 1,
  "intro": "",
  "is_disbanded": 0,
  "name": "rd",
  "work_mail": "rd@ibm.starfish.im"
}
```

## 解散讨论组

```javascript
ORG API: PATCH /orgs/:org_id/discussion_groups/:group_id
```

__参数：__

```javascript
{
  "is_disbanded": 1
}
```

## 添加用户到讨论组

```javascript
ORG API: POST /orgs/:org_id/discussion_groups/:group_id/members
```

__参数：__

```javascript
{
  "departments": [
    51,
    52
  ],
  "exclude_departments": [
    2
  ],
  "exclude_members": [
    9,
    10
  ],
  "members": [
    5,
    6
  ]
}
```

## 获取讨论组成员列表

```javascript
ORG API: GET /orgs/:org_id/discussion_groups/:group_id1,[:group_id2,:group_id3...]/members
```

__返回：__


```javascript
{
  "41": [
    2,
    3
  ]
}
```


## 获取讨论组成员列表(支持分页，返回详情)

```javascript
ORG API: GET /orgs/:org_id/discussion_groups/:group_id/members?detail=1&page=1&count=10
```

__参数：__
detail=1 返回详细内容; detail=2 返回详细内容包括work_mail;
page=1，count=10，返回第page页的count条数据。

__返回：__

```javascript
[
  {
    "avatar": "...",
    "id": 2,
    "name": "Lucy"
  },
  {
    "avatar": "...",
    "id": 3,
    "name": "Steve"
  }
]
```

## 查看用户讨论组信息

```javascript
ORG API: GET /orgs/:org_id/discussion_groups/:group_id/members/:member_id
```
__返回：__

```javascript
{
  "avatar": "https://api.starfish.im/v1/discussion-group-avatars/1/29/",
  "creator": 4,
  "creator_info": {
    "avatar": "...",
    "id": 4,
    "name": "Steve",
    "order_field": 2085161728
  },
  "id": 29,
  "intro": "moto",
  "is_disbanded": 0,
  "is_left": 1,
  "member_count": 20,
  "name": "hello",
  "related_project_id": 1
}
```

## 将用户从讨论组删除

```javascript
ORG API: DELETE /orgs/:org_id/discussion_groups/:group_id/members/:member_id
```

__注：管理员可以删除讨论组中任何成员，讨论组成员也可以主动退出讨论组。__

# 部门

## 创建部门
```javascript
ORG API: POST /orgs/:org_id/departments
```

__参数：__

```javascript
{
  "members": [
    1,
    2,
    3
  ],
  "name": "rd",
  "parent": 1
}
```

__返回：__

```javascript
{
  "avatar": "https://devapi.starfish.im/v1/department-avatars/1/1/",
  "creator": 1,
  "creator_info": {
    "avatar": "...",
    "id": 1,
    "name": "Steve",
    "order_field": 2085161728
  },
  "id": 2,
  "is_disbanded": 0,
  "name": "rd",
  "parent": 1,
  "type": 0,
  "work_mail": "rd@starfish.im"
}
```

## 更新部门

```javascript
ORG API: PATCH /orgs/:org_id/departments/:id
```

__参数：__

```javascript
{
  "is_disbanded": 1,
  "name": "rd"
}
```

__返回：__

```javascript
{
  "avatar": "https://devapi.starfish.im/v1/department-avatars/1/1/",
  "creator": 1,
  "creator_info": {
    "avatar": "...",
    "id": 1,
    "name": "Steve",
    "order_field": 2085161728
  },
  "id": 2,
  "is_disbanded": 1,
  "name": "rd",
  "parent": 1,
  "type": 0,
  "work_mail": "rd@starfish.im"
}
```

## 获取部门详情

```javascript
ORG API: GET /orgs/:org_id/departments/:id
```

__返回：__

```javascript
{
  "all_members_count": 3,
  "avatar": "https://api.starfish.im/v1/department-avatars/1/55/1445936029",
  "children_count": 0,
  "creator": 133,
  "creator_info": {
    "avatar": "https://api.starfish.im/v1/user-avatars/133/0/2015-08-18/86048298/f.bbgen",
    "id": 133,
    "name": "quyilin",
    "order_field": 1903524201
  },
  "id": 55,
  "is_disbanded": 0,
  "name": "\u4ea7\u54c1\u90e84",
  "order_field": 1668309556,
  "parent": 51,
  "parents": [
    {
      "all_members_count": 15,
      "avatar": "https://api.starfish.im/v1/department-avatars/1/51/0/2015-06-09/52098416/f.jpg",
      "children_count": 8,
      "creator": 250,
      "creator_info": {
        "avatar": "http://media1.yunxuetang.cn/yxt/Media/UserFiles/UserPhotos/huiz/201406/57a4cf44-f4d2-461b-b6bf-6f0750d236643.png",
        "id": 250,
        "name": "admin",
        "order_field": 1633971561
      },
      "id": 51,
      "is_disbanded": 0,
      "name": "Number One",
      "order_field": 1853189474,
      "parent": 0,
      "type": 1,
      "work_mail": ""
    }
  ],
  "type": 0,
  "work_mail": ""
}
```

## 获取部门列表

```javascript
ORG API: GET /orgs/:org_id/departments?parent=:parent_id&page=1&count=10
```

__参数：__

返回指定parent_id下面的部门列表，不指定parent_id则返回所有。
page=1，count=10，返回第page页的count条数据。

__返回：__

```javascript
[
  {
    "all_members_count": 5,
    "avatar": "https://devapi.starfish.im/v1/department-avatars/1/1/",
    "children_count": 3,
    "creator": 1,
    "creator_info": {
      "avatar": "...",
      "id": 1,
      "name": "Steve",
      "order_field": 2085161728
    },
    "id": 2,
    "is_disbanded": 1,
    "name": "rd",
    "parent": 1,
    "type": 0,
    "work_mail": "rd@starfish.im"
  }
]
```


## 获取部门下所属子部门及成员（支持分页）

```javascript
ORG API: GET /orgs/:org_id/departments/:parent_id/items?page=1&count=10
```

__参数：__

返回指定parent_id下的子部门及成员。
page=1，count=10，返回第page页的count条数据。

__返回：__

* ITEM_TYPE_DEPARTMENT = 1
* ITEM_TYPE_MEMBER = 2

```javascript
[
  {
    "item": {
      "all_members_count": 5,
      "avatar": "https://devapi.starfish.im/v1/department-avatars/1/1/",
      "children_count": 3,
      "creator": 1,
      "creator_info": {
        "avatar": "...",
        "id": 1,
        "name": "Steve",
        "order_field": 2085161728
      },
      "id": 2,
      "is_disbanded": 1,
      "name": "rd",
      "parent": 1,
      "type": 0,
      "work_mail": "rd@starfish.im"
    },
    "item_type": 1
  },
  {
    "item": {
      "avatar": "...",
      "id": 1,
      "item_type": 2,
      "name": "alice",
      "order_field": 1785161728,
      "position": "engineer",
      "work_mail": "alice@starfish.im"
    },
    "item_type": 2
  }
]
```

## 批量修改部门邮件地址

```javascript
ORG API: PATCH /orgs/:org_id/departments
```

__参数：__

```javascript
[
  {
    "domain_id": 5,
    "group_id": 4,
    "work_mail_local_part": "rd"
  }
]
```

## 添加部门成员

```javascript
ORG API: POST /orgs/:org_id/departments/:id/members
```

__参数：__

```javascript
{
  "user_ids": [
    1,
    2
  ]
}
```

## 获取部门成员(DEPRECATED)

```javascript
ORG API: GET /orgs/:org_id/departments/:id1[,id2,id3,...]/members?is_direct=1
```

__参数：__

is_direct=1, 只返回直属于该部门的成员，否则该部门的(多层)子部门成员也返回。默认为1。


__返回：__

```javascript
{
  "1": [
    2,
    3
  ],
  "2": [
    6,
    7
  ]
}
```


## 获取部门成员(支持分页，返回详情)

```javascript
ORG API: GET /orgs/:org_id/departments/:department_id/members?is_direct=1&detail=1&page=1&count=10
```

__参数：__

is_direct=1, 只返回直属于该部门的成员，否则该部门的(多层)子部门成员也返回。默认为1。
page=1，count=10，返回第page页的count条数据。

detail=1 返回详细内容;
detail=2 返回"work_mail"额外字段。
detail=3 返回姓别、部门、职位、所在城市、个人简介、是否是管理员等额外字段。

__返回：__

```javascript
[
  {
    "avatar": "...",
    "id": 6,
    "name": "Joe",
    "order_field": 1685161828
  },
  {
    "avatar": "...",
    "id": 2,
    "name": "Lucy",
    "order_field": 1785161728
  },
  {
    "avatar": "...",
    "id": 7,
    "name": "Michale",
    "order_field": 1985161728
  },
  {
    "avatar": "...",
    "id": 3,
    "name": "Steve",
    "order_field": 2085161728
  }
]
```

## 查看部门及成员信息

```javascript
ORG API: GET /orgs/:org_id/departments/:id/members/:user_id
```
__返回：__

```javascript
{
  "all_members_count": 30,
  "avatar": "https://devapi.starfish.im/v1/department-avatars/1/1/",
  "creator": 1,
  "creator_info": {
    "avatar": "...",
    "id": 1,
    "name": "Steve",
    "order_field": 2085161728
  },
  "id": 2,
  "is_disbanded": 1,
  "is_left": 0,
  "member_count": 20,
  "name": "rd",
  "parent": 1,
  "type": 0,
  "work_mail": "rd@starfish.im"
}
```

## 删除部门成员

```javascript
ORG API: DELETE /orgs/:org_id/departments/:id/members/:user_id1[,:user_id2,:user_id3...]
```

## 修改用户部门

```javascript
ORG API: PATCH /orgs/:org_id/members/:user_id/departments
```

__参数：__

```javascript
[
  1,
  3,
  4
]
```

## 查看用户部门

```javascript
ORG API: GET /orgs/:org_id/members/:user_id/departments?is_direct=1
```
__参数：__

is_direct=1, 只返回成员的直属部门，否则返回所有（直属、非直属）部门。默认为0。

__返回：__

```javascript
[
  {
    "avatar": "...",
    "id": 1,
    "is_direct": 1,
    "name": "cloud"
  },
  {
    "avatar": "...",
    "id": 2,
    "is_direct": 0,
    "name": "product"
  }
]
```


# 邀请

## 邀请状态

```javascript
STATUS_INIT = 0
STATUS_IGNORE = 1
STATUS_REFUSE = 2
STATUS_CONFIRM = 3
```

## 邀请用户加入组织

```javascript
NORMAL API: POST /invitations
```

__参数：__

// 邀请 Starfish 用户

```javascript
{
  "org_id": 1,
  "user_id": 15
}
```

// 通过手机邀请外部用户

```javascript
{
  "org_id": 1,
  "to": [
    "13856789876",
    "15959595959"
  ]
}
```
// 通过邮箱邀请外部用户

```javascript
{
  "org_id": 1,
  "to": [
    "alice@google.com"
  ]
}
```
// 通过微信邀请

```javascript
{
  "org_id": 1
}
```

__返回：__

```javascript
{
  "date_added": 1397201477,
  "date_updated": 1395714700,
  "id": 476,
  "org": {
    "avatar": "https://api.starfish.im/v1/org-avatars/1/",
    "creator": 4,
    "creator_info": {
      "avatar": "...",
      "id": 4,
      "name": "Steve",
      "order_field": 2085161728
    },
    "domain": "b.starfish.im",
    "id": 1,
    "intro": "bitbrothers",
    "name": "bitbrothers"
  },
  "org_id": 1,
  "status": 0,
  "who": {
    "avatar": "https://api.starfish.im/v1/user-avatars/4/2014-03-05/73/a.jpg",
    "gender": 0,
    "id": 4,
    "intro": "",
    "name": "zenglu",
    "phone": "9527"
  },
  "whom": {
    "avatar": "https://api.starfish.im/v1/user-avatars/15/0/2014-04-10/60/f.jpg",
    "gender": 0,
    "id": 15,
    "intro": "",
    "name": "changhua",
    "phone": "9528"
  }
}
```

## 更新邀请状态

```javascript
NORMAL API: PATCH /invitations/:invitation_id
```

__参数：__

```javascript
{
  "status": 0
}
```

__返回：__

```javascript
{
  "date_added": 1397201477,
  "date_updated": 1395714700,
  "id": 476,
  "org": {
    "avatar": "https://api.starfish.im/v1/org-avatars/1/",
    "creator": 4,
    "creator_info": {
      "avatar": "...",
      "id": 4,
      "name": "Steve",
      "order_field": 2085161728
    },
    "domain": "b.starfish.im",
    "id": 1,
    "intro": "",
    "name": "bitbrothers"
  },
  "org_id": 1,
  "status": 1,
  "who": {
    "avatar": "https://api.starfish.im/v1/user-avatars/4/2014-03-05/73/a.jpg",
    "gender": 0,
    "id": 4,
    "intro": "",
    "name": "liuzenglu",
    "phone": "9527"
  },
  "whom": {
    "avatar": "https://api.starfish.im/v1/user-avatars/15/0/2014-04-10/60/f.jpg",
    "gender": 0,
    "id": 15,
    "intro": "",
    "name": "changhua",
    "phone": "9528"
  }
}
```

# 外部联系人

## 添加外部联系人

```javascript
ORG API: POST /orgs/:org_id/external_contacts
```

__参数：__

```javascript
{
  "address": "",
  "corporation": "",
  "department": "",
  "email": "",
  "gender": 2,
  "id": 2,
  "manager": 2,
  "name": "alice",
  "phone": "9527",
  "position": "",
  "wechat": ""
}
```

__注：该 API 可以上传头像，字段名：avatar，头像文件以附件形式上传，此时请求编码格式为：multipart/form-data。__

__返回：__

```javascript
{
  "address": "",
  "avatar": "https://api.starfish.im/v1/external_contact-avatars/1/3/",
  "corporation": "",
  "creator": 2,
  "creator_info": {
    "avatar": "...",
    "id": 2,
    "name": "Steve",
    "order_field": 2085161728
  },
  "department": "",
  "email": "",
  "formatted_phone": "+86 9527",
  "gender": 2,
  "id": 2,
  "manager": 2,
  "name": "alice",
  "phone": "9527",
  "position": "",
  "wechat": ""
}
```

## 修改外部联系人

```javascript
ORG API: PATCH /orgs/:org_id/external_contacts/:external_contact_id
```

__参数：__

```javascript
{
  "address": "",
  "corporation": "",
  "department": "",
  "email": "",
  "gender": 2,
  "id": 2,
  "manager": 2,
  "name": "alice",
  "phone": "9527",
  "position": "",
  "wechat": ""
}
```

__注：该 API 可以修改头像，字段名：avatar，头像文件以附件形式上传，此时请求编码格式为：multipart/form-data。__

__返回：__

```javascript
{
  "address": "",
  "avatar": "https://api.starfish.im/v1/external_contact-avatars/1/3/",
  "corporation": "",
  "creator": 2,
  "creator_info": {
    "avatar": "...",
    "id": 2,
    "name": "Steve",
    "order_field": 2085161728
  },
  "department": "",
  "email": "",
  "formatted_phone": "+86 9527",
  "gender": 2,
  "id": 2,
  "manager": 2,
  "name": "alice",
  "phone": "9527",
  "position": "",
  "wechat": ""
}
```

## 外部联系人列表

```javascript
ORG API: GET /orgs/:org_id/external_contacts
```

__返回：__

```javascript
[
  {
    "address": "",
    "avatar": "https://api.starfish.im/v1/external_contact-avatars/1/3/",
    "corporation": "",
    "creator": 2,
    "creator_info": {
      "avatar": "...",
      "id": 2,
      "name": "Steve",
      "order_field": 2085161728
    },
    "department": "",
    "email": "",
    "formatted_phone": "+86 9527",
    "gender": 2,
    "id": 2,
    "manager": 2,
    "name": "alice",
    "phone": "9527",
    "position": "",
    "wechat": ""
  }
]
```
## 查看外部联系人详情

```javascript
ORG API: GET /orgs/:org_id/external_contacts/:external_contact_id
```

__返回：__

```javascript
{
  "address": "",
  "avatar": "https://api.starfish.im/v1/external_contact-avatars/1/3/",
  "corporation": "",
  "creator": 2,
  "creator_info": {
    "avatar": "...",
    "id": 2,
    "name": "Steve",
    "order_field": 2085161728
  },
  "department": "",
  "email": "",
  "formatted_phone": "+86 9527",
  "gender": 2,
  "id": 2,
  "manager": 2,
  "name": "alice",
  "phone": "9527",
  "position": "",
  "wechat": ""
}
```

## 删除外部联系人

```javascript
ORG API: DELETE /orgs/:org_id/external_contacts/:external_contact_id
```

# 会话&消息

## 常量定义

### MessageType

```javascript
TYPE_INVITATION_CREATED = 0
TYPE_INVITATION_UPDATED = 1

TYPE_TEXT_CHAT_CREATED = 2
TYPE_MULTIMEDIA_CHAT_CREATED = 3

TYPE_TASK_CREATED = 5
TYPE_TASK_COMPLETED = 47
TYPE_TASK_COMMENT_CREATED = 22

TYPE_VOICE_MESSAGE_UPDATED = 56

TYPE_MESSAGE_UPDATED = 7

TYPE_USER_UPDATED = 8

TYPE_CONVERSATION_CREATED = 9
TYPE_CONVERSATION_UPDATED = 18
TYPE_CONVERSATION_DELETED = 21
TYPE_MESSAGES_DELETED_IN_CONVERSATION = 57

TYPE_ORG_CREATED = 10
TYPE_ORG_UPDATED = 11

TYPE_DISCUSSION_GROUP_CREATED = 12
TYPE_DISCUSSION_GROUP_UPDATED = 13
TYPE_DISCUSSION_GROUP_DISBANDED = 20

TYPE_ORG_MEMBER_JOINED = 14
TYPE_ORG_MEMBER_LEFT = 15

TYPE_DISCUSSION_GROUP_MEMBER_JOINED = 16
TYPE_DISCUSSION_GROUP_MEMBER_LEFT = 17

TYPE_GLOBAL_MESSAGES_UPDATED = 19

TYPE_DEPARTMENT_CREATED = 40
TYPE_DEPARTMENT_UPDATED = 41
TYPE_DEPARTMENT_DISBANDED = 42

TYPE_DEPARTMENT_MEMBER_JOINED = 43
TYPE_DEPARTMENT_MEMBER_LEFT = 44
TYPE_MEMBER_DEPARTMENTS_UPDATED = 55

TYPE_AGENT_ONLINE = 45
TYPE_AGENT_OFFLINE = 46

TYPE_USER_SELF_PASSWORD_CHANGED = 49
TYPE_OFFLINE = 50

TYPE_ORG_MEMBER_UPDATED = 51

TYPE_ORG_APP_UPDATED = 52
TYPE_ORG_MEMBER_NAVI_APP_UPDATED = 53

TYPE_MESSAGE_UNREAD_COUNT_UPDATED = 54

```

### SrcType

```javascript
SYSTEM = 0
ORG_MEMBER = 1
EXTERNAL_CONTACT = 2
GENERATED_CONTACT = 4
```

### DestType

```javascript
ORG_MEMBER = 0
DISCUSSION_GROUP = 1
ORG = 2
DEPARTMENT = 3
```

### PeerType，conversation 的对方称为 peer

```javascript
ORG_MEMBER = 0
DISCUSSION_GROUP = 1
EXTERNAL_CONTACT = 2
DEPARTMENT = 3
GENERATED_CONTACT = 4
```

## maxwell 推送示例

### 结构说明

推送内容的结构是：

```javascript
{
  "body": {},
  "date_added": 1395714696,
  "dest": {
    "avatar": "...",
    "id": 1,
    "name": "Target",
    "order_field": 2085161728
  },
  "dest_type": 1,
  "id": 1,
  "scope_org_id": 0,
  "src": {
    "avatar": "...",
    "id": 3,
    "name": "From",
    "order_field": 2085161728
  },
  "src_type": 1,
  "type": 1
}
```

以下示例省略这些公共字段，只给出 body 内容。

### TYPE_INVITATION_CREATED = 0

```javascript
{
  "invitation": {
    "date_added": 1395714700,
    "date_updated": 1395714700,
    "id": 1,
    "org": {
      "avatar": "https://devapi.starfish.im/v1/org-avatars/1/",
      "creator": 1,
      "creator_info": {
        "avatar": "...",
        "id": 1,
        "name": "Steve",
        "order_field": 2085161728
      },
      "domain": "ibm.starfish.im",
      "id": 1,
      "intro": "",
      "name": "ibm"
    },
    "status": 0,
    "who": {
      "avatar": "https://devapi.starfish.im/v1/user-avatars/1/",
      "gender": 1,
      "id": 1,
      "intro": "",
      "name": "alice",
      "phone": "123"
    },
    "whom": {
      "avatar": "https://devapi.starfish.im/v1/user-avatars/5/",
      "gender": 1,
      "id": 5,
      "intro": "",
      "name": "kate",
      "phone": "126"
    }
  }
}
```

### TYPE_INVITATION_UPDATED = 1

```javascript
{
  "invitation": {
    "date_added": 1395714700,
    "date_updated": 1395714700,
    "id": 1,
    "org": {
      "avatar": "https://devapi.starfish.im/v1/org-avatars/1/",
      "creator": 1,
      "creator_info": {
        "avatar": "...",
        "id": 1,
        "name": "Steve",
        "order_field": 2085161728
      },
      "domain": "ibm.starfish.im",
      "id": 1,
      "intro": "",
      "name": "ibm"
    },
    "status": 1,
    "who": {
      "avatar": "https://devapi.starfish.im/v1/user-avatars/1/",
      "gender": 1,
      "id": 1,
      "intro": "",
      "name": "alice",
      "phone": "123"
    },
    "whom": {
      "avatar": "https://devapi.starfish.im/v1/user-avatars/5/",
      "gender": 1,
      "id": 5,
      "intro": "",
      "name": "kate",
      "phone": "126"
    }
  }
}
```

### TYPE_TEXT_CHAT_CREATED = 2

```javascript
{
  "chat": {
    "content": "hello moto",
    "date_added": 1395714696,
    "dest": {
      "avatar": "...",
      "id": 2,
      "name": "Target",
      "order_field": 2085161728
    },
    "dest_type": 0,
    "id": 1,
    "src": {
      "avatar": "...",
      "id": 3,
      "name": "From",
      "order_field": 2085161728
    },
    "src_type": 1
  }
}
```

### TYPE_MULTIMEDIA_CHAT_CREATED = 3

// 录音，length 是音频时长

```javascript
{
  "chat": {
    "date_added": 1395714696,
    "dest": {
      "avatar": "...",
      "id": 2,
      "name": "Target",
      "order_field": 2085161728
    },
    "dest_type": 0,
    "filename": "1/2014-03-25/65/f",
    "id": 1,
    "length": 3,
    "mimetype": "audio/mp4",
    "name": "hello.starfish-m4a",
    "src": {
      "avatar": "...",
      "id": 3,
      "name": "From",
      "order_field": 2085161728
    },
    "src_type": 1,
    "url": "https://api.starfish.im/v1/orgs/1/attachment/chats/1"
  }
}
```

// 截图

```javascript
{
  "chat": {
    "date_added": 1395714696,
    "dest": {
      "avatar": "...",
      "id": 2,
      "name": "Target",
      "order_field": 2085161728
    },
    "dest_type": 0,
    "filename": "1/2014-03-25/65/f",
    "id": 1,
    "mimetype": "image/jpeg",
    "name": "hello.starfish-png",
    "size": 1801842,
    "src": {
      "avatar": "...",
      "id": 3,
      "name": "From",
      "order_field": 2085161728
    },
    "src_type": 1,
    "thumbs": {
      "mobile": {
        "height": 768,
        "width": 1024
      }
    },
    "url": "https://api.starfish.im/v1/orgs/1/chats/1/attachment"
  }
}
```

// mp3 文件

```javascript
{
  "chat": {
    "date_added": 1422328269,
    "dest": {
      "avatar": "...",
      "id": 2,
      "name": "Target",
      "order_field": 2085161728
    },
    "dest_type": 0,
    "filepath": "1/2015-01-27/78730028/f.mp3",
    "id": 1,
    "mimetype": "audio/mpeg",
    "name": "hello.mp3",
    "size": 3836351,
    "src": {
      "avatar": "...",
      "id": 3,
      "name": "From",
      "order_field": 2085161728
    },
    "src_type": 1,
    "url": "https://api.starfish.im/v1/orgs/1/chats/1/attachment"
  }
}
```

// pdf 文件

```javascript
{
  "chat": {
    "date_added": 1422328607,
    "dest": {
      "avatar": "...",
      "id": 2,
      "name": "Target",
      "order_field": 2085161728
    },
    "dest_type": 0,
    "filepath": "1/2015-01-27/32358657/f.pdf",
    "id": 1,
    "mimetype": "application/pdf",
    "name": "exim-filter.pdf",
    "size": 101338,
    "src": {
      "avatar": "...",
      "id": 3,
      "name": "From",
      "order_field": 2085161728
    },
    "src_type": 1,
    "url": "https://api.starfish.im/v1/orgs/1/chats/1/attachment"
  }
}
```

### TYPE_TASK_CREATED = 5

```javascript
{
  "operator": {
    "avatar": "https://devapi.starfish.im/v1/user-avatars/1/",
    "gender": 1,
    "id": 1,
    "intro": "",
    "name": "alice",
    "phone": "123"
  },
  "task": {
    "assignee": 2,
    "assignee_info": {
      "avatar": "...",
      "id": 2,
      "name": "Steve",
      "order_field": 2085161728
    },
    "content": "moto",
    "creator": 1,
    "creator_info": {
      "avatar": "...",
      "id": 1,
      "name": "Steve",
      "order_field": 2085161728
    },
    "date_added": 1399268928,
    "date_completed": 0,
    "date_due": 1399273928,
    "expected_hours": 0,
    "id": 1,
    "project": {
      "creator": 1,
      "creator_info": {
        "avatar": "...",
        "id": 1,
        "name": "Steve",
        "order_field": 2085161728
      },
      "id": 1,
      "intro": "test intro",
      "name": "test project",
      "org_id": 1,
      "person_in_charge": 1,
      "person_in_charge_info": {
        "avatar": "...",
        "id": 1,
        "name": "Steve",
        "order_field": 2085161728
      }
    },
    "project_id": 0,
    "spent_hours": 0,
    "subject": "hello",
    "tag": [
      {
        "id": 5,
        "name": "v1",
        "project_id": 7
      }
    ],
    "tag_id": 0
  }
}
```

### TYPE_TASK_COMPLETED = 47

```javascript
{
  "operator": {
    "avatar": "https://devapi.starfish.im/v1/user-avatars/1/",
    "gender": 1,
    "id": 1,
    "intro": "",
    "name": "alice",
    "phone": "123"
  },
  "task": {
    "assignee": 2,
    "assignee_info": {
      "avatar": "...",
      "id": 2,
      "name": "Steve",
      "order_field": 2085161728
    },
    "content": "moto",
    "creator": 1,
    "creator_info": {
      "avatar": "...",
      "id": 1,
      "name": "Steve",
      "order_field": 2085161728
    },
    "date_added": 1399268928,
    "date_completed": 0,
    "date_due": 1399273928,
    "expected_hours": 0,
    "id": 1,
    "project": {
      "creator": 1,
      "creator_info": {
        "avatar": "...",
        "id": 1,
        "name": "Steve",
        "order_field": 2085161728
      },
      "id": 1,
      "intro": "test intro",
      "name": "test project",
      "org_id": 1,
      "person_in_charge": 1,
      "person_in_charge_info": {
        "avatar": "...",
        "id": 1,
        "name": "Steve",
        "order_field": 2085161728
      }
    },
    "project_id": 0,
    "spent_hours": 0,
    "subject": "hello",
    "tag": [
      {
        "id": 5,
        "name": "v1",
        "project_id": 7
      }
    ],
    "tag_id": 0
  }
}
```

### TYPE_TASK_COMMENT_CREATED = 22

```javascript
{
  "comment": {
    "content": "hello",
    "creator": 2,
    "creator_info": {
      "avatar": "...",
      "id": 2,
      "name": "Steve",
      "order_field": 2085161728
    }
  },
  "operator": {
    "avatar": "https://devapi.starfish.im/v1/user-avatars/1/",
    "gender": 1,
    "id": 1,
    "intro": "",
    "name": "alice",
    "phone": "123"
  },
  "task": {
    "assignee": 2,
    "assignee_info": {
      "avatar": "...",
      "id": 2,
      "name": "Steve",
      "order_field": 2085161728
    },
    "content": "moto",
    "creator": 1,
    "creator_info": {
      "avatar": "...",
      "id": 1,
      "name": "Steve",
      "order_field": 2085161728
    },
    "date_added": 1399268928,
    "date_completed": 0,
    "date_due": 1399273928,
    "expected_hours": 0,
    "id": 1,
    "project": {
      "creator": 1,
      "creator_info": {
        "avatar": "...",
        "id": 1,
        "name": "Steve",
        "order_field": 2085161728
      },
      "id": 1,
      "intro": "test intro",
      "name": "test project",
      "org_id": 1,
      "person_in_charge": 1,
      "person_in_charge_info": {
        "avatar": "...",
        "id": 1,
        "name": "Steve",
        "order_field": 2085161728
      }
    },
    "project_id": 0,
    "spent_hours": 0,
    "subject": "hello",
    "tag": [
      {
        "id": 5,
        "name": "v1",
        "project_id": 7
      }
    ],
    "tag_id": 0
  }
}
```

### TYPE_VOICE_MESSAGE_UPDATED = 56

ACK //接听
CANCEL//取消
BYE //挂断
DENY //拒绝
```javascript
{
  "dest": {
    "avatar": "...",
    "id": 2,
    "name": "Target",
    "order_field": 2085161728
  },
  "dest_type": 0,
  "duration": 123,
  "operation": "BYE",
  "src": {
    "avatar": "...",
    "id": 3,
    "name": "From",
    "order_field": 2085161728
  },
  "src_type": 1
}
```


### TYPE_MESSAGE_UPDATED = 7

```javascript
{
  "conversation": 2345,
  "messages": [
    4000739999318717000,
    4000739999318719000
  ],
  "status": 1
}
```

### TYPE_USER_UPDATED = 8

```javascript
{
  "user": {
    "avatar": "https://devapi.starfish.im/v1/user-avatars/1/2014-03-26/46/a.gif/2014-03-26/19/f",
    "gender": 1,
    "id": 1,
    "intro": "",
    "name": "alice",
    "phone": "123"
  }
}
```

### TYPE_CONVERSATION_CREATED = 9

```javascript
{
  "conversation": {
    "id": 4349,
    "last_message": {
      "body": {
        "chat": {
          "content": "hello",
          "date_added": 1423628172,
          "dest": {
            "avatar": "...",
            "id": 2,
            "name": "Target",
            "order_field": 2085161728
          },
          "dest_type": 1,
          "id": 170186,
          "src": {
            "avatar": "...",
            "id": 3,
            "name": "From",
            "order_field": 2085161728
          },
          "src_type": 1
        }
      },
      "date_added": 1423628172,
      "dest": {
        "avatar": "...",
        "id": 2,
        "name": "Target",
        "order_field": 2085161728
      },
      "dest_type": 1,
      "id": 4000739999318717000,
      "is_ignored": 0,
      "is_read": 1,
      "scope_org_id": 1,
      "src": {
        "avatar": "...",
        "id": 3,
        "name": "From",
        "order_field": 2085161728
      },
      "src_type": 1,
      "type": 2
    },
    "peer": {
      "avatar": "...",
      "id": 651,
      "name": "From",
      "order_field": 2085161728
    },
    "peer_type": 1,
    "unread_count": 0,
    "user_id": 2
  }
}
```

### TYPE_CONVERSATION_UPDATED = 18

```javascript
{
  "conversation": {
    "id": 4349,
    "is_hide": 0,
    "last_message": {
      "body": {
        "chat": {
          "content": "hello",
          "date_added": 1423628172,
          "dest": {
            "avatar": "...",
            "id": 2,
            "name": "Target",
            "order_field": 2085161728
          },
          "dest_type": 1,
          "id": 170186,
          "src": {
            "avatar": "...",
            "id": 3,
            "name": "From",
            "order_field": 2085161728
          },
          "src_type": 1
        }
      },
      "date_added": 1423628172,
      "dest": {
        "avatar": "...",
        "id": 2,
        "name": "Target",
        "order_field": 2085161728
      },
      "dest_type": 1,
      "id": 4000739999318717000,
      "is_ignored": 0,
      "is_read": 1,
      "scope_org_id": 1,
      "src": {
        "avatar": "...",
        "id": 3,
        "name": "From",
        "order_field": 2085161728
      },
      "src_type": 1,
      "type": 2
    },
    "peer": {
      "avatar": "...",
      "id": 651,
      "name": "To",
      "order_field": 2085161728
    },
    "peer_type": 1,
    "unread_count": 0,
    "user_id": 2
  }
}
```

### TYPE_CONVERSATION_DELETED = 21

```javascript
{
  "conversation": {
    "id": 1,
    "last_message_id": 7,
    "peer": {
      "avatar": "...",
      "id": 651,
      "name": "To",
      "order_field": 2085161728
    },
    "peer_type": 0,
    "unread_count": 1,
    "user_id": 1
  }
}
```

### TYPE_ORG_CREATED = 10

```javascript
{
  "org": {
    "avatar": "https://devapi.starfish.im/v1/org-avatars/1/",
    "creator": 1,
    "creator_info": {
      "avatar": "...",
      "id": 1,
      "name": "Steve",
      "order_field": 2085161728
    },
    "domain": "ibm.starfish.im",
    "id": 1,
    "intro": "",
    "name": "ibm",
    "order_field": 2085161728
  }
}
```

### TYPE_ORG_UPDATED = 11

```javascript
{
  "org": {
    "avatar": "https://devapi.starfish.im/v1/org-avatars/1/2014-03-26/87/a.gif/2014-03-26/14/f",
    "creator": 1,
    "creator_info": {
      "avatar": "...",
      "id": 1,
      "name": "Steve",
      "order_field": 2085161728
    },
    "domain": "ibm.starfish.im",
    "id": 1,
    "intro": "hello moto",
    "name": "ibm-hello",
    "order_field": 2085161728
  }
}
```

### TYPE_DISCUSSION_GROUP_CREATED = 12

```javascript
{
  "group": {
    "avatar": "https://devapi.starfish.im/v1/discussion-group-avatars/1/1/",
    "creator": 1,
    "creator_info": {
      "avatar": "...",
      "id": 1,
      "name": "Steve",
      "order_field": 2085161728
    },
    "id": 1,
    "intro": "",
    "is_disbanded": 0,
    "name": "rd"
  }
}
```

### TYPE_DISCUSSION_GROUP_UPDATED = 13

```javascript
{
  "group": {
    "avatar": "https://devapi.starfish.im/v1/discussion-group-avatars/1/1/",
    "creator": 1,
    "creator_info": {
      "avatar": "...",
      "id": 1,
      "name": "Steve",
      "order_field": 2085161728
    },
    "id": 1,
    "intro": "foobar",
    "is_disbanded": 0,
    "name": "hello.moto",
    "work_mail": "cloud_group@starfish.im"
  }
}
```

### TYPE_DISCUSSION_GROUP_DISBANDED = 20

```javascript
{
  "group": {
    "avatar": "https://devapi.starfish.im/v1/discussion-group-avatars/1/1/",
    "creator": 1,
    "creator_info": {
      "avatar": "...",
      "id": 1,
      "name": "Steve",
      "order_field": 2085161728
    },
    "id": 1,
    "intro": "foobar",
    "is_disbanded": 1,
    "name": "hello.moto"
  }
}
```

### TYPE_ORG_MEMBER_JOINED = 14

```javascript
{
  "org": {
    "avatar": "https://devapi.starfish.im/v1/org-avatars/1/",
    "creator": 1,
    "creator_info": {
      "avatar": "...",
      "id": 1,
      "name": "Steve",
      "order_field": 2085161728
    },
    "domain": "ibm.starfish.im",
    "id": 1,
    "intro": "",
    "name": "ibm",
    "order_field": 2085161728
  },
  "user": {
    "avatar": "https://devapi.starfish.im/v1/user-avatars/1/",
    "gender": 1,
    "id": 1,
    "intro": "",
    "name": "alice",
    "phone": "123"
  }
}
```

### TYPE_ORG_MEMBER_LEFT = 15

```javascript
{
  "org": {
    "avatar": "https://devapi.starfish.im/v1/org-avatars/1/",
    "creator": 1,
    "creator_info": {
      "avatar": "...",
      "id": 1,
      "name": "Steve",
      "order_field": 2085161728
    },
    "domain": "ibm.starfish.im",
    "id": 1,
    "intro": "",
    "name": "ibm",
    "order_field": 2085161728
  },
  "user": {
    "avatar": "https://devapi.starfish.im/v1/user-avatars/1/",
    "gender": 1,
    "id": 1,
    "intro": "",
    "name": "alice",
    "phone": "123"
  }
}
```

### TYPE_DISCUSSION_GROUP_MEMBER_JOINED = 16

```javascript
{
  "group": {
    "avatar": "https://devapi.starfish.im/v1/discussion-group-avatars/1/1/",
    "creator": 1,
    "creator_info": {
      "avatar": "...",
      "id": 1,
      "name": "Steve",
      "order_field": 2085161728
    },
    "id": 1,
    "intro": "",
    "is_disbanded": 0,
    "name": "rd"
  },
  "operator": {
    "avatar": "https://devapi.starfish.im/v1/user-avatars/1/",
    "gender": 1,
    "id": 1,
    "intro": "",
    "name": "alice",
    "phone": "123"
  },
  "user": {
    "avatar": "https://devapi.starfish.im/v1/user-avatars/2/",
    "gender": 1,
    "id": 2,
    "intro": "",
    "name": "bob",
    "phone": "456"
  }
}
```

### TYPE_DISCUSSION_GROUP_MEMBER_LEFT = 17

```javascript
{
  "group": {
    "avatar": "https://devapi.starfish.im/v1/discussion-group-avatars/1/1/",
    "creator": 1,
    "creator_info": {
      "avatar": "...",
      "id": 1,
      "name": "Steve",
      "order_field": 2085161728
    },
    "id": 1,
    "intro": "",
    "is_disbanded": 0,
    "name": "rd"
  },
  "operator": {
    "avatar": "https://devapi.starfish.im/v1/user-avatars/1/",
    "gender": 1,
    "id": 1,
    "intro": "",
    "name": "alice",
    "phone": "123"
  },
  "user": {
    "avatar": "https://devapi.starfish.im/v1/user-avatars/2/",
    "gender": 1,
    "id": 2,
    "intro": "",
    "name": "bob",
    "phone": "456"
  }
}
```

### TYPE_GLOBAL_MESSAGES_UPDATED = 19

```javascript
{
  "messages": [
    4000739999318717300,
    4000739999318717310
  ],
  "status": 1,
  "value": {
    "id": 1,
    "last_updated": 1395808466,
    "unread_count": 1,
    "user_id": 5
  }
}
```

### TYPE_DEPARTMENT_CREATED = 40

```javascript
{
  "group": {
    "avatar": "https://devapi.starfish.im/v1/discussion-group-avatars/1/1/",
    "creator": 1,
    "creator_info": {
      "avatar": "...",
      "id": 1,
      "name": "Steve",
      "order_field": 2085161728
    },
    "id": 1,
    "is_disbanded": 0,
    "name": "rd",
    "parent": 1
  }
}
```

### TYPE_DEPARTMENT_UPDATED = 41

```javascript
{
  "group": {
    "avatar": "https://devapi.starfish.im/v1/discussion-group-avatars/1/1/",
    "creator": 1,
    "creator_info": {
      "avatar": "...",
      "id": 1,
      "name": "Steve",
      "order_field": 2085161728
    },
    "id": 1,
    "is_disbanded": 0,
    "name": "hello.moto",
    "parent": 1,
    "work_mail": "rd@starfish.im"
  }
}
```

### TYPE_DEPARTMENT_DISBANDED = 42

```javascript
{
  "group": {
    "avatar": "https://devapi.starfish.im/v1/discussion-group-avatars/1/1/",
    "creator": 1,
    "creator_info": {
      "avatar": "...",
      "id": 1,
      "name": "Steve",
      "order_field": 2085161728
    },
    "id": 1,
    "is_disbanded": 1,
    "name": "hello.moto",
    "parent": 1
  }
}
```

### TYPE_DEPARTMENT_MEMBER_JOINED = 43

```javascript
{
  "group": {
    "avatar": "https://devapi.starfish.im/v1/discussion-group-avatars/1/1/",
    "creator": 1,
    "creator_info": {
      "avatar": "...",
      "id": 1,
      "name": "Steve",
      "order_field": 2085161728
    },
    "id": 1,
    "is_disbanded": 0,
    "name": "rd",
    "parent": 1
  },
  "operator": {
    "avatar": "https://devapi.starfish.im/v1/user-avatars/1/",
    "gender": 1,
    "id": 1,
    "intro": "",
    "name": "alice",
    "phone": "123"
  },
  "user": {
    "avatar": "https://devapi.starfish.im/v1/user-avatars/2/",
    "gender": 1,
    "id": 2,
    "intro": "",
    "name": "bob",
    "order_field": 2003134827,
    "phone": "456"
  }
}
```

### TYPE_DEPARTMENT_MEMBER_LEFT = 44

```javascript
{
  "group": {
    "avatar": "https://devapi.starfish.im/v1/discussion-group-avatars/1/1/",
    "creator": 1,
    "creator_info": {
      "avatar": "...",
      "id": 1,
      "name": "Steve",
      "order_field": 2085161728
    },
    "id": 1,
    "is_disbanded": 0,
    "name": "rd"
  },
  "operator": {
    "avatar": "https://devapi.starfish.im/v1/user-avatars/1/",
    "gender": 1,
    "id": 1,
    "intro": "",
    "name": "alice",
    "phone": "123"
  },
  "user": {
    "avatar": "https://devapi.starfish.im/v1/user-avatars/2/",
    "gender": 1,
    "id": 2,
    "intro": "",
    "name": "bob",
    "phone": "456"
  }
}
```

### TYPE_AGENT_ONLINE = 45

```javascript
{
  "agent": {
    "desc": "alice iphone",
    "key": "c7b4b54f8dac7cf66e732924964a53f2",
    "type": 10
  },
  "online_agents_count": 3,
  "user_id": 3
}
```

### TYPE_AGENT_OFFLINE = 46

```javascript
{
  "agent": {
    "desc": "alice iphone",
    "key": "c7b4b54f8dac7cf66e732924964a53f2",
    "type": 10
  },
  "online_agents_count": 1,
  "user_id": 3
}
```

### TYPE_USER_SELF_PASSWORD_CHANGED = 49

```javascript
{
  "user_id": 3
}
```

### TYPE_OFFLINE = 50

```javascript
{
  "message": "some message"
}
```

### TYPE_ORG_MEMBER_UPDATED = 51

```javascript
{
  "org_id": 1,
  "user": {
    "departments": [
      "cloud"
    ],
    "domain_id": 5,
    "id": 133,
    "local_part": "lily",
    "position": "",
    "work_mail": "lily@bit.test.com"
  }
}
```

### TYPE_ORG_APP_UPDATED = 52

```javascript
{
  "app": 1,
  "create_time": "2015-04-20T18:26:44",
  "create_timestamp": 1429525604,
  "creator": 13,
  "creator_info": {
    "avatar": "...",
    "id": 13,
    "name": "Steve",
    "order_field": 2085161728
  },
  "is_install": 1,
  "org_id": 1
}
```

### TYPE_ORG_MEMBER_NAVI_APP_UPDATED = 53

```javascript
{
  "app": 1,
  "is_navi": 0,
  "org_id": 1,
  "user_id": 12
}
```

### TYPE_MESSAGE_UNREAD_COUNT_UPDATED = 54

```javascript
{
  "data": [
    {
      "message_id": 4112418252890224000,
      "peer_id": 651,
      "peer_type": 3,
      "unread_count": 5
    }
  ]
}
```

### TYPE_MEMBER_DEPARTMENTS_UPDATED = 55


```javascript
{
  "is_direct": [
    4,
    5
  ],
  "is_not_direct": [
    1,
    2,
    3
  ],
  "user_id": 1
}
```

### TYPE_MESSAGES_DELETED_IN_CONVERSATION = 57

```javascript
{
  "conversation": {
    "id": 1,
    "last_message_id": 7,
    "peer": {
      "avatar": "...",
      "id": 651,
      "name": "To",
      "order_field": 2085161728
    },
    "peer_type": 0,
    "unread_count": 1,
    "user_id": 1
  }
}
```


## 根据 peer_id，peer_type 查询 conversation

```javascript
ORG API: GET /orgs/:org_id/members/:member_id/conversations?peer_id=:peer_id&peer_type=:peer_type
```

__返回：如果能查到 conversation 则返回如下结果，否则返回空 data。__

```javascript
{
  "id": 4,
  "last_message_id": 109,
  "last_updated": 1395640459,
  "peer": {
    "avatar": "...",
    "id": 1,
    "name": "Real",
    "order_field": 2085161728
  },
  "peer_type": 1,
  "unread_count": 4,
  "user_id": 6
}
```

## 获取指定组织成员的 conversation 列表

```javascript
ORG API: GET /orgs/:org_id/members/:member_id/conversations?start=:conversation_id&ps=30
```
__参数：获取比 start 更早的conversation列表，倒序排列（最新的排在前面），返回 ps 条数据。__
__返回：__

```javascript
[
  {
    "id": 4349,
    "last_message": {
      "body": {
        "chat": {
          "content": "hello",
          "date_added": 1423628172,
          "dest": {
            "avatar": "...",
            "id": 651,
            "name": "Target",
            "order_field": 2085161728
          },
          "dest_type": 1,
          "id": 170186,
          "src": {
            "avatar": "...",
            "id": 4,
            "name": "Patrick",
            "order_field": 2085161728
          },
          "src_type": 1
        }
      },
      "date_added": 1423628172,
      "dest": {
        "avatar": "...",
        "id": 651,
        "name": "Target",
        "order_field": 2085161728
      },
      "dest_type": 1,
      "id": 4000739999318717000,
      "is_ignored": 0,
      "is_read": 1,
      "scope_org_id": 1,
      "src": {
        "avatar": "...",
        "id": 4,
        "name": "Patrick",
        "order_field": 2085161728
      },
      "src_type": 1,
      "type": 2,
      "unread_count": 3
    },
    "peer": {
      "avatar": "...",
      "id": 651,
      "name": "Target",
      "order_field": 2085161728
    },
    "peer_type": 1,
    "unread_count": 0,
    "user_id": 2
  }
]
```

## 删除 conversation

```javascript
ORG API: DELETE /orgs/:org_id/conversations/:conversation_id
```


## 更新 conversation

```javascript
ORG API: PATCH /orgs/:org_id/conversations/:conversation_id
```

__参数：__

// 标为隐藏is_hide=1, 取消隐藏is_hide=0
// 删除会话内所有消息， is_delete_all_messages=1

```javascript
{
  "is_delete_all_messages": 0,
  "is_hide": 1
}
```


## 获取指定 conversation 的消息列表

```javascript
ORG API: GET /orgs/:org_id/conversations/:conversation_id/messages?start=:id&ps=30
```

__参数：__

* 返回 ps 条消息，默认30，返回列表倒序排列（最新的排在前面）。
* 当指定start: 获取比 start 更早的ps条消息。
* 当指定end：获取比end更晚的ps条消息。
* 【当指定end="first_unread"，end为conversation内最早的未读消息id。即获取最早一条未读消息，以及更晚的ps条消息。】
* 当指定middle: 获取包含middle在内的前后各ps/2条消息。
* 不指定 start，end和middle，获取最新的消息列表。

__返回：__
unread_count = -1， 该消息未统计。

```javascript
[
  {
    "body": {
      "chat": {
        "content": "hello",
        "date_added": 1423628172,
        "dest": {
          "avatar": "...",
          "id": 651,
          "name": "Target",
          "order_field": 2085161728
        },
        "dest_type": 1,
        "id": 170186,
        "src": {
          "avatar": "...",
          "id": 4,
          "name": "Patrick",
          "order_field": 2085161728
        },
        "src_type": 1
      }
    },
    "date_added": 1423628172,
    "dest": {
      "avatar": "...",
      "id": 651,
      "name": "Target",
      "order_field": 2085161728
    },
    "dest_type": 1,
    "id": 4000739999318717000,
    "is_ignored": 0,
    "is_read": 1,
    "scope_org_id": 1,
    "src": {
      "avatar": "...",
      "id": 4,
      "name": "Patrick",
      "order_field": 2085161728
    },
    "src_type": 1,
    "type": 2,
    "unread_count": 3
  }
]
```

## 更新组织内消息状态

```javascript
ORG API: PATCH /orgs/:org_id/messages/:id1[,:id2,:id3,......]
```

__参数：__

// 标记为已读

```javascript
{
  "is_read": 1
}
```

// 标记为忽略

```javascript
{
  "is_ignored": 1
}
```

## 将 conversation 下所有未读消息标记为忽略

```javascript
ORG API: PATCH /orgs/:org_id/conversations/:conversation_id/messages
```

__参数：__

```javascript
{
  "is_ignored": 1
}
```

## 获取指定组织消息状态

```javascript
ORG API: GET /orgs/:org_id/messages/:message_id/status?status=:status&start=:start&ps=:ps
```
* STATUS_NULL = 0
* STATUS_READ = 1
* STATUS_IGNORE = 2

__参数：指定上述 status 获取消息不同状态的成员列表；
获取以 start （上页结尾id）为基础下一页数据，不指定 start 获取首页数据。每页ps条数据。__

__返回：__

```javascript
[
  {
    "id": 88,
    "update_at": 1395711923,
    "user": {
      "avatar": "...",
      "id": 1,
      "name": "Steve"
    },
    "user_id": 1
  },
  {
    "id": 89,
    "update_at": 1395717924,
    "user": {
      "avatar": "...",
      "id": 2,
      "name": "Alice"
    },
    "user_id": 2
  },
  {
    "id": 90,
    "update_at": 1395717925,
    "user": {
      "avatar": "...",
      "id": 4,
      "name": "Bob"
    },
    "user_id": 4
  }
]
```

## 获取指定用户的全局消息列表

```javascript
NORMAL API: GET /users/:user_id/messages?start=:start
```

__参数：获取比 start 更早的消息列表，倒序排列（最新的排在前面），不指定 start 获取最新的消息列表，返回 30 条消息。__

__返回：__

```javascript
[
  {
    "body": {
      "invitation": {
        "date_added": 1395714700,
        "date_updated": 1395714700,
        "id": 1,
        "org": {
          "avatar": "https://devapi.starfish.im/v1/org-avatars/1/",
          "creator": 1,
          "creator_info": {
            "avatar": "...",
            "id": 1,
            "name": "Steve",
            "order_field": 2085161728
          },
          "domain": "ibm.starfish.im",
          "id": 1,
          "intro": "",
          "name": "ibm"
        },
        "status": 0,
        "who": {
          "avatar": "https://devapi.starfish.im/v1/user-avatars/1/",
          "gender": 1,
          "id": 1,
          "intro": "",
          "name": "alice",
          "phone": "123"
        },
        "whom": {
          "avatar": "https://devapi.starfish.im/v1/user-avatars/5/",
          "gender": 1,
          "id": 5,
          "intro": "",
          "name": "kate",
          "phone": "126"
        }
      }
    },
    "date_added": 1423628172,
    "dest": {
      "avatar": "...",
      "id": 2,
      "name": "Target",
      "order_field": 2085161728
    },
    "dest_type": 1,
    "id": 4000739999318717000,
    "is_ignored": 0,
    "is_read": 1,
    "scope_org_id": 1,
    "src": {
      "avatar": "...",
      "id": 3,
      "name": "From",
      "order_field": 2085161728
    },
    "src_type": 1,
    "type": 2
  }
]
```

## 获取指定用户的全局消息数目

```javascript
NORMAL API: GET /users/:user_id/messages/unread_count
```

__返回：__

```javascript
0
```

## 更新全局消息状态

```javascript
NORMAL API: PATCH /messages/:id1[,:id2,:id3,......]
```

__参数：__

// 标记为已读

```javascript
{
  "is_read": 1
}
```

// 标记为忽略

```javascript
{
  "is_ignored": 1
}
```

## 获取指定全局消息统计信息

```javascript
NORMAL API: GET /messages/:message_id/status
```

__返回：__

```javascript
[
  {
    "status": "read",
    "time": 1395711923,
    "user": 1
  },
  {
    "status": "ignored",
    "time": 1395717923,
    "user": 2
  },
  {
    "status": "unread",
    "time": 1395717923,
    "user": 4
  }
]
```
## 获取指定 conversation 的未读消息 id 列表

```javascript
ORG API: GET /orgs/:org_id/conversations/:conversation_id/messages/unread_ids?page=1&count=100
```

__参数：__

* page（默认1），count（默认100），取第page页count条数据。

* asc=0(默认), 返回值倒叙排列（新消息在前）；asc=1返回值正序排列（新消息在后）。

__返回：__

```javascript
[
  4000739999318717000,
  4050179771177935400
]
```

# 聊天

## 发起聊天

```javascript
ORG API: POST /orgs/:org_id/messages
```

__参数：__

// 文本聊天

```javascript
{
  "body": {
    "chat": {
      "content": "hello"
    }
  },
  "dest_id": 1,
  "dest_type": 1,
  "type": 2
}
```

// 多媒体聊天

```javascript
{
  "body": {
    "chat": {
      "bfs_file_id": 1,
      "name": "hello.mp3"
    }
  },
  "dest_id": 1,
  "dest_type": 1,
  "type": 3
}
```

__返回：__

// 文本聊天

```javascript
{
  "body": {
    "chat": {
      "content": "moto",
      "date_added": 1424050988,
      "dest": {
        "avatar": "...",
        "id": 2,
        "name": "Target",
        "order_field": 2085161728
      },
      "dest_type": 0,
      "id": 177040,
      "src": {
        "avatar": "...",
        "id": 3,
        "name": "From",
        "order_field": 2085161728
      },
      "src_type": 1
    }
  },
  "date_added": 1424050988,
  "dest": {
    "avatar": "...",
    "id": 2,
    "name": "Target",
    "order_field": 2085161728
  },
  "dest_type": 0,
  "id": 4004286829822905300,
  "is_ignored": 0,
  "is_read": 1,
  "scope_org_id": 1,
  "src": {
    "avatar": "...",
    "id": 3,
    "name": "From",
    "order_field": 2085161728
  },
  "src_type": 1,
  "type": 2,
  "unread_count": -1
}
```

// 注意：多媒体聊天和文本聊天类似，内部格式请参照 TYPE_MULTIMEDIA_CHAT_CREATED

## 转发消息

```javascript
ORG API: POST /orgs/:org_id/messages
```

type 可选：TYPE_TEXT_CHAT_CREATED，TYPE_MULTIMEDIA_CHAT_CREATED，TYPE_TASK_CREATED，TYPE_TASK_COMPLETED

__参数：__
type is TYPE_TEXT_CHAT_CREATED or TYPE_MULTIMEDIA_CHAT_CREATED

```javascript
{
  "body": {
    "chat": {
      "id": 1
    }
  },
  "dests": [
    {
      "id": 1,
      "type": 1
    }
  ],
  "type": 2
}
```

type is TYPE_TASK_CREATED or TYPE_TASK_COMPLETED
```javascript
{
  "body": {
    "task": {
      "id": 1
    }
  },
  "dests": [
    {
      "id": 1,
      "type": 1
    }
  ],
  "type": 5
}
```

## 发送（共享）文件

```javascript
ORG API: POST /orgs/:org_id/messages
```

type 可选：TYPE_FILES_CREATED

__参数：__

```javascript
{
  "body": {
    "files": [
      1,
      2,
      3
    ]
  },
  "dests": [
    {
      "id": 1,
      "type": 1
    }
  ],
  "type": 48
}
```

## 获取聊天中的附件

```javascript
ORG API: GET /orgs/:org_id/chats/:chat_id/attachment
```

__返回：对于图片，加上参数：width=:width, height=:height 可以获得缩略图__

# 邮件

## 常量定义

```javascript
DIRECTION:

INCOMING = 1
OUTGOING = 2
BOTH = 3


CONTENT_TYPE:

CONTENT_TYPE_TEXT_PLAIN = 0
CONTENT_TYPE_TEXT_HTML = 1


ACTION_TYPE:

NEW_SUBJECT = 1
REPLY = 2
FORWARD = 4


邮件地址类型(owner_type)：

ORG_MEMBER = 0
DEPARTMENT = 1
DISCUSSION_GROUP = 2

```

## 下载邮件中的附件

```javascript
ORG API: GET /orgs/:org_id/mail/mails/:mail_id/attachments/:attachment_id
```

__返回：邮件附件内容__

## 获取最近联系人列表

```javascript
ORG API: GET /orgs/:org_id/mail/contacts/recent
```

__返回：__

```javascript
[
  "support@starfish.im"
]
```

## 发邮件

```javascript
ORG API: POST /orgs/:org_id/mail/mails
```

__参数：__

// 主动上传附件

```javascript
{
  "action_type": 0,
  "attachments": [
    {
      "bfs_file_id": 11,
      "name": "a.png"
    }
  ],
  "bcc": [],
  "cc": [],
  "content": "moto",
  "reply_to": 3,
  "subject": "hello",
  "to": [
    "zenglu.liu@gmail.com"
  ]
}
```

// 转发邮件，带附件

```javascript
{
  "action_type": 0,
  "attachments": [
    {
      "id": 11,
      "name": "abc.png"
    }
  ],
  "bcc": [],
  "cc": [],
  "content": "moto",
  "reply_to": 3,
  "subject": "hello",
  "to": [
    "zenglu.liu@gmail.com"
  ]
}
```


__返回：__

```javascript
{
  "attachments": [],
  "content": "moto",
  "date": 1427954231,
  "direction": 2,
  "id": 679,
  "is_deleted": 0,
  "is_read": 1,
  "mail_id": 679,
  "meta": {
    "action_type": 0,
    "cc": [
      "someone@163.com"
    ],
    "cc_info": [
      {}
    ],
    "from": "liuzenglu@starfish.im",
    "from_detail": {
      "type": 1,
      "value": {
        "avatar": "https://api.starfish.im/v1/user-avatars/2/0/2014-10-14/54232863/f",
        "formatted_phone": "+86  2821",
        "gender": 0,
        "id": 2,
        "name": "zenglu",
        "phone": "821"
      }
    },
    "subject": "hello",
    "to": [
      "zengluliu@yeah.net"
    ],
    "to_info": [
      {
        "avatar": "...",
        "id": 2,
        "name": "zenglu",
        "owner_type": 0
      }
    ]
  },
  "subject": {
    "attachments": [],
    "content": "moto",
    "date": 1427954231,
    "direction": 2,
    "id": 679,
    "is_deleted": 0,
    "is_read": 1,
    "last_mail_id": 679,
    "meta": {
      "action_type": 0,
      "cc": [],
      "from": "liuzenglu@starfish.im",
      "from_detail": {
        "type": 1,
        "value": {
          "avatar": "https://api.starfish.im/v1/user-avatars/2/0/2014-10-14/54232863/f",
          "formatted_phone": "+86 2821",
          "gender": 0,
          "id": 2,
          "name": "zenglu",
          "phone": "821"
        }
      },
      "subject": "hello",
      "to": [
        "zengluliu@yeah.net"
      ]
    },
    "seq": 679,
    "subject_id": 679,
    "user_id": 2
  },
  "subject_id": 679,
  "user_id": 2
}
```

## 获取指定组织成员的主题列表

```javascript
ORG API: GET /orgs/:org_id/members/:member_id/mail/subjects?seq=:seq&ps=:ps
```

__参数：给定 seq，则取 < seq 的 ps 条记录，否则取最新的 ps 条记录，按照 id 反序排列。__

__返回：__

```javascript
[
  {
    "attachments": [
      {
        "filename": "mmexport1392362289750.jpg",
        "filepath": "1/2014-03-28/28/f",
        "filesize": 24034,
        "id": 1,
        "mimetype": "image/jpeg"
      }
    ],
    "content": "moto2",
    "contents": [
      {
        "content": "moto2",
        "content_type": 0,
        "id": 5
      }
    ],
    "date": 1398152580,
    "direction": 2,
    "from": "lucy@starfish.im",
    "from_detail": {
      "type": 1,
      "value": {
        "avatar": "https://api.starfish.im/v1/user-avatars/133/member_info_default_icon2.png",
        "formatted_phone": "+86 185 5000 0000",
        "gender": 2,
        "id": 133,
        "intro": "",
        "name": "lucy",
        "phone": "18550000000"
      }
    },
    "id": 3,
    "is_deleted": 0,
    "is_read": 1,
    "last_mail_id": 3,
    "meta": {
      "cc": [
        "someone@163.com"
      ],
      "cc_info": [
        {}
      ],
      "from": "liuzenglu@starfish.im",
      "from_detail": {
        "type": 0,
        "value": {
          "id": 1,
          "name": "alice"
        }
      },
      "subject": "hello",
      "to": [
        "zengluliu@yeah.net"
      ],
      "to_info": [
        {
          "avatar": "...",
          "id": 2,
          "name": "zenglu",
          "owner_type": 0
        }
      ]
    },
    "seq": 2,
    "subject": "hello5",
    "subject_id": "1005",
    "user_id": 4
  }
]
```

## 获取指定主题的邮件列表

```javascript
ORG API: GET /orgs/:org_id/mail/subjects/:subject_id/mails?start=:start&ps=:ps
```

__参数：给定 start，则取 > start 的 ps 条记录，否则取最老的 ps 条记录，按照 id 正序排列。__

__返回：__

```javascript
[
  {
    "attachments": [
      {
        "filename": "mmexport1392362289750.jpg",
        "filepath": "1/2014-03-28/28/f",
        "filesize": 24034,
        "id": 1,
        "mimetype": "image/jpeg"
      }
    ],
    "content": "moto2",
    "contents": [
      {
        "content": "moto2",
        "content_type": 0,
        "id": 6
      }
    ],
    "date": 1398152980,
    "direction": 2,
    "id": 4,
    "is_deleted": 0,
    "is_read": 1,
    "meta": {
      "cc": [],
      "from": "liuzenglu@starfish.im",
      "from_detail": {
        "type": 0,
        "value": {
          "id": 1,
          "name": "alice"
        }
      },
      "subject": "hello",
      "to": [
        "zengluliu@yeah.net"
      ],
      "to_info": [
        {
          "avatar": "...",
          "id": 2,
          "name": "zenglu",
          "owner_type": 0
        }
      ]
    },
    "subject_id": 1,
    "user_id": 4
  }
]
```

## 根据 mail_id 获取同主题的邮件列表

```javascript
ORG API: GET /orgs/:org_id/members/:member_id/mail/subjects?mail_id=:mail_id&start=:start&ps=:ps
```

__参数：给定 start，则取 > start 的 ps 条记录，否则取最老的 ps 条记录，按照 id 正序排列。__

__返回：__

见：获取指定主题的邮件列表

## 获取主题详情

```javascript
ORG API: GET /orgs/:org_id/mail/subjects/:subject_id
```
__返回：__

```javascript
{
  "attachments": [
    {
      "filename": "\u4f60\u597da5.png",
      "filepath": "t/f",
      "filesize": 5750,
      "id": 145,
      "mimetype": "text/plain"
    },
    {
      "filename": "\u8fd9\u5c31\u662f.png",
      "filepath": "t/f",
      "filesize": 5750,
      "id": 146,
      "mimetype": "text/plain"
    }
  ],
  "content": "moto5",
  "date": 1432539975,
  "direction": 2,
  "id": 1001,
  "is_deleted": 0,
  "is_read": 1,
  "mail_id": 1001,
  "meta": {
    "action_type": 1,
    "cc": [
      "zengluliu@yeah.net"
    ],
    "cc_info": [
      {
        "avatar": "...",
        "id": 2,
        "name": "zenglu",
        "owner_type": 0
      }
    ],
    "from": "quyilin@starfish.im",
    "from_detail": {
      "type": 1,
      "value": {
        "avatar": "https://api.starfish.im/v1/user-avatars/133/member_info_default_icon2.png",
        "formatted_phone": "+86 185 5167 5371",
        "gender": 2,
        "id": 133,
        "intro": "",
        "name": "\u66f2\u5955\u9716",
        "phone": "18551675371"
      }
    },
    "subject": "hello5",
    "to": [
      "165214965@qq.com"
    ],
    "to_info": [
      {}
    ]
  },
  "subject_id": 1001,
  "user_id": 133
}
```

## 标记主题已读

```javascript
ORG API: PATCH /orgs/:org_id/mail/subjects/:subject_id
```

## 标记邮件已读

```javascript
ORG API: PATCH /orgs/:org_id/mail/mails/:mail_id1[,:mail_id2,:mail_id3,......]
```

__参数：__

// 0 => 未读，1 => 已读

```javascript
{
  "is_read": 0
}
```

## 删除主题

```javascript
ORG API: DELETE /orgs/:org_id/mail/subjects/:subject_id
```

## 删除邮件

```javascript
ORG API: DELETE /orgs/:org_id/mail/mails/:mail_id
```

# 项目

## 创建项目

```javascript
ORG API: POST /orgs/:org_id/project/projects
```

__参数：__

```javascript
{
  "intro": "",
  "members": [
    1,
    2
  ],
  "name": "starfish",
  "person_in_charge": 1,
  "person_in_charge_info": {
    "avatar": "...",
    "id": 1,
    "name": "Steve",
    "order_field": 2085161728
  },
  "tags": [
    {
      "name": "m1"
    },
    {
      "name": "m2"
    }
  ]
}
```

__返回：__

```javascript
{
  "creator": 4,
  "creator_info": {
    "avatar": "...",
    "id": 4,
    "name": "Steve",
    "order_field": 2085161728
  },
  "id": 7,
  "intro": "",
  "members": [
    1,
    2
  ],
  "members_info": [
    {
      "avatar": "...",
      "id": 1,
      "name": "Steve"
    },
    {
      "avatar": "...",
      "id": 2,
      "name": "Alice"
    }
  ],
  "name": "starfish",
  "person_in_charge": 1,
  "person_in_charge_info": {
    "avatar": "...",
    "id": 1,
    "name": "Steve",
    "order_field": 2085161728
  },
  "priority": [
    {
      "color": 16711680,
      "id": 1,
      "is_system": 1,
      "name": "high"
    },
    {
      "color": 16747520,
      "id": 2,
      "is_system": 1,
      "name": "middle"
    },
    {
      "color": 32768,
      "id": 3,
      "is_system": 1,
      "name": "low"
    }
  ],
  "status": [
    {
      "id": 5,
      "is_system": 1,
      "name": "ready"
    },
    {
      "id": 6,
      "is_system": 1,
      "name": "started"
    },
    {
      "id": 7,
      "is_system": 1,
      "name": "finished"
    },
    {
      "id": 8,
      "is_system": 1,
      "name": "expired"
    }
  ],
  "tags": [
    {
      "id": 4,
      "name": "m2",
      "project_id": 7
    },
    {
      "id": 3,
      "name": "m1",
      "project_id": 7
    }
  ]
}
```

## 获取指定项目详情

```javascript
ORG API: GET /orgs/:org_id/project/projects/:project_id
```

__返回：__

```javascript
{
  "creator": 4,
  "creator_info": {
    "avatar": "...",
    "id": 4,
    "name": "Steve",
    "order_field": 2085161728
  },
  "id": 7,
  "intro": "",
  "member_task_stats": {
    "1": {
      "completed": 0,
      "uncompleted": 0
    }
  },
  "members": [
    1,
    2
  ],
  "members_info": [
    {
      "avatar": "...",
      "id": 1,
      "name": "Steve"
    },
    {
      "avatar": "...",
      "id": 2,
      "name": "Alice"
    }
  ],
  "name": "starfish",
  "person_in_charge": 1,
  "person_in_charge_info": {
    "avatar": "...",
    "id": 1,
    "name": "Steve",
    "order_field": 2085161728
  },
  "priority": [
    {
      "color": 16711680,
      "id": 1,
      "is_system": 1,
      "name": "high"
    },
    {
      "color": 16747520,
      "id": 2,
      "is_system": 1,
      "name": "middle"
    },
    {
      "color": 32768,
      "id": 3,
      "is_system": 1,
      "name": "low"
    }
  ],
  "status": [
    {
      "id": 5,
      "is_system": 1,
      "name": "ready"
    },
    {
      "id": 6,
      "is_system": 1,
      "name": "started"
    },
    {
      "id": 7,
      "is_system": 1,
      "name": "finished"
    },
    {
      "id": 8,
      "is_system": 1,
      "name": "expired"
    }
  ],
  "tags": [
    {
      "id": 4,
      "name": "m2",
      "project_id": 7
    },
    {
      "id": 3,
      "name": "m1",
      "project_id": 7
    }
  ],
  "task_stats": {
    "completed": 0,
    "uncompleted": 0
  }
}
```

## 更新项目

```javascript
ORG API: PATCH /orgs/:org_id/project/projects/:project_id
```

__参数：__

```javascript
{
  "intro": "",
  "is_closed": 1,
  "members": [
    1,
    2
  ],
  "name": "starfish",
  "person_in_charge": 1,
  "person_in_charge_info": {
    "avatar": "...",
    "id": 1,
    "name": "Steve",
    "order_field": 2085161728
  }
}
```

__返回：__

```javascript
{
  "creator": 4,
  "creator_info": {
    "avatar": "...",
    "id": 4,
    "name": "Steve",
    "order_field": 2085161728
  },
  "id": 7,
  "intro": "",
  "member_task_stats": {
    "1": {
      "completed": 0,
      "uncompleted": 0
    }
  },
  "members": [
    1,
    2
  ],
  "members_info": [
    {
      "avatar": "...",
      "id": 1,
      "name": "Steve"
    },
    {
      "avatar": "...",
      "id": 2,
      "name": "Alice"
    }
  ],
  "name": "starfish",
  "person_in_charge": 1,
  "person_in_charge_info": {
    "avatar": "...",
    "id": 1,
    "name": "Steve",
    "order_field": 2085161728
  },
  "priority": [
    {
      "color": 16711680,
      "id": 1,
      "is_system": 1,
      "name": "high"
    },
    {
      "color": 16747520,
      "id": 2,
      "is_system": 1,
      "name": "middle"
    },
    {
      "color": 32768,
      "id": 3,
      "is_system": 1,
      "name": "low"
    }
  ],
  "status": [
    {
      "id": 5,
      "is_system": 1,
      "name": "ready"
    },
    {
      "id": 6,
      "is_system": 1,
      "name": "started"
    },
    {
      "id": 7,
      "is_system": 1,
      "name": "finished"
    },
    {
      "id": 8,
      "is_system": 1,
      "name": "expired"
    }
  ],
  "tags": [
    {
      "id": 4,
      "name": "m2",
      "project_id": 7
    },
    {
      "id": 3,
      "name": "m1",
      "project_id": 7
    }
  ],
  "task_stats": {
    "completed": 0,
    "uncompleted": 0
  }
}
```

## 获取指定用户和当前用户共有的项目列表

```javascript
ORG API: GET /orgs/:org_id/members/:user_id/project/projects
```

__返回：__

```javascript
[
  {
    "creator": 4,
    "creator_info": {
      "avatar": "...",
      "id": 4,
      "name": "Steve",
      "order_field": 2085161728
    },
    "id": 7,
    "intro": "",
    "member_task_stats": {
      "1": {
        "completed": 0,
        "uncompleted": 0
      }
    },
    "members": [
      1,
      2
    ],
    "members_info": [
      {
        "avatar": "...",
        "id": 1,
        "name": "Steve"
      },
      {
        "avatar": "...",
        "id": 2,
        "name": "Alice"
      }
    ],
    "name": "starfish",
    "person_in_charge": 1,
    "person_in_charge_info": {
      "avatar": "...",
      "id": 1,
      "name": "Steve",
      "order_field": 2085161728
    },
    "tags": [
      {
        "id": 4,
        "name": "m2",
        "project_id": 7
      },
      {
        "id": 3,
        "name": "m1",
        "project_id": 7
      }
    ],
    "task_stats": {
      "completed": 0,
      "uncompleted": 0
    }
  }
]
```

## 查看项目下任务统计

```javascript
ORG API: GET /orgs/:org_id/project/projects/task_statistic
```

__参数：person_in_charge，获取指定负责人的项目统计；participant，获取指定参与者的项目统计。__

__注：支持翻页，pn：翻页页码，ps：翻页大小。__

__返回：__

```javascript
[
  {
    "creator": 9,
    "creator_info": {
      "avatar": "...",
      "id": 9,
      "name": "Steve",
      "order_field": 2085161728
    },
    "id": 1,
    "intro": "foobar",
    "name": "project name",
    "person_in_charge": 4,
    "person_in_charge_info": {
      "avatar": "...",
      "id": 4,
      "name": "Steve",
      "order_field": 2085161728
    },
    "tags": [],
    "task_statistic": {
      "completed": 0,
      "percent": 0,
      "total": 1
    }
  }
]
```

## 查看指定项目和用户下的任务统计记录

```javascript
ORG API: GET /orgs/:org_id/project/projects/:project_id/members/:user_id/statistic/record
```

__参数：start，获取记录的起始日期（必填）；end，获取记录的截止日期（选填，默认当天）。__
__start，end格式例如 "2015-04-30"__

__返回：__

```javascript
[
  {
    "completed": 2,
    "date": "2015-04-27",
    "timestamp": 1430064000,
    "uncompleted": 1
  },
  {
    "completed": 3,
    "date": "2015-04-28",
    "timestamp": 1430150400,
    "uncompleted": 2
  },
  {
    "completed": 4,
    "date": "2015-04-29",
    "timestamp": 1430236800,
    "uncompleted": 2
  },
  {
    "completed": 5,
    "date": "2015-04-30",
    "timestamp": 1430323200,
    "uncompleted": 1
  }
]
```

## 项目列表

```javascript
ORG API: GET /orgs/:org_id/project/projects
```

__参数：__
person_in_charge，获取指定负责人的项目列表；participant，获取指定参与者的项目列表。
members_count, 指定每个项目返回的members个数。


__返回：__

```javascript
[
  {
    "creator": 4,
    "creator_info": {
      "avatar": "...",
      "id": 4,
      "name": "Steve",
      "order_field": 2085161728
    },
    "id": 7,
    "intro": "",
    "member_task_stats": {
      "1": {
        "completed": 0,
        "uncompleted": 0
      }
    },
    "members": [
      1,
      2
    ],
    "members_info": [
      {
        "avatar": "...",
        "id": 1,
        "name": "Steve"
      },
      {
        "avatar": "...",
        "id": 2,
        "name": "Alice"
      }
    ],
    "name": "starfish",
    "person_in_charge": 1,
    "person_in_charge_info": {
      "avatar": "...",
      "id": 1,
      "name": "Steve",
      "order_field": 2085161728
    },
    "tags": [
      {
        "id": 4,
        "name": "m2",
        "project_id": 7
      },
      {
        "id": 3,
        "name": "m1",
        "project_id": 7
      }
    ],
    "task_stats": {
      "completed": 0,
      "uncompleted": 0
    }
  }
]
```

## 添加项目成员

```javascript
ORG API: POST /orgs/:org_id/project/projects/:project_id/members
```

__参数：__

```javascript
[
  1,
  2,
  4
]
```

## 删除项目成员

```javascript
ORG API: DELETE /orgs/:org_id/project/projects/:project_id/members/:user_id
```

## 项目成员列表

```javascript
ORG API: GET /orgs/:org_id/project/projects/:project_id/members?detail=1&page=1&count=30
```

参数：
detail=1, 返回详情；detail=0返回id列表。
给定 page（默认1），count（默认30），则取第page页count条数据。

__返回：__

detail = 0

```javascript
[
  1,
  2
]
```

detail = 1
```javascript
[
  {
    "avatar": "...",
    "completed": 10,
    "id": 1,
    "name": "Steve",
    "uncompleted": 8
  },
  {
    "avatar": "...",
    "completed": 20,
    "id": 2,
    "name": "Alice",
    "uncompleted": 18
  }
]
```

## 创建标签

```javascript
ORG API: POST /orgs/:org_id/project/projects/:project_id/tags
```

__参数：__

```javascript
{
  "name": "tag name"
}
```

__返回：__

```javascript
{
  "id": 5,
  "name": "tag name",
  "project_id": 7
}
```

## 更新标签

```javascript
ORG API: PATCH /orgs/:org_id/project/projects/:project_id/tags/:tag_id
```

__参数：__

```javascript
{
  "name": "new tag name"
}
```

__返回：__

```javascript
{
  "id": 5,
  "name": "new tag name",
  "project_id": 7
}
```

## 删除标签

```javascript
ORG API: DELETE /orgs/:org_id/project/projects/:project_id/tags/:tag_id
```

## 标签列表

```javascript
ORG API: GET /orgs/:org_id/project/projects/:project_id/tags
```

__返回：__

```javascript
[
  {
    "id": 5,
    "name": "v1",
    "project_id": 7
  }
]
```

## 给任务添加标签

```javascript
ORG API: POST /orgs/:org_id/project/tasks/:task_id/tags
```

__参数：__

```javascript
{
  "name": "tag name"
}
```

## 删除任务标签

```javascript
ORG API: DELETE /orgs/:org_id/project/tasks/:task_id/tags/:tag_id
```

## 创建任务

```javascript
ORG API: POST /orgs/:org_id/project/tasks
```

__参数：__

```javascript
{
  "after_task": 0,
  "assignee": 1,
  "assignee_info": {
    "avatar": "...",
    "id": 1,
    "name": "Steve",
    "order_field": 2085161728
  },
  "attachments": [
    {
      "bfs_file_id": 11,
      "name": "exim-filter.pdf"
    }
  ],
  "content": "task content",
  "date_due": 1398755714,
  "expected_hours": 0,
  "priority": 2,
  "project_id": 0,
  "spent_hours": 2,
  "status": 1,
  "subject": "task subject",
  "tags": [
    "bug",
    "hot"
  ]
}
```

__返回：__

```javascript
{
  "assignee": 2,
  "assignee_info": {
    "avatar": "...",
    "id": 2,
    "name": "Steve",
    "order_field": 2085161728
  },
  "attachments": [
    {
      "creator": 1,
      "creator_info": {
        "avatar": "...",
        "id": 1,
        "name": "Steve",
        "order_field": 2085161728
      },
      "filename": "exim-filter.pdf",
      "filepath": "1/2014-07-16/26/f_2.pdf",
      "filesize": 101338,
      "id": 1,
      "mimetype": "application/pdf",
      "task_id": 1
    }
  ],
  "content": "moto",
  "creator": 1,
  "creator_info": {
    "avatar": "...",
    "id": 1,
    "name": "Steve",
    "order_field": 2085161728
  },
  "date_added": 1399268928,
  "date_completed": 0,
  "date_due": 1399273928,
  "expected_hours": 0,
  "id": 1,
  "org_id": 1,
  "priority": {
    "color": 16711680,
    "id": 2,
    "is_system": 1,
    "name": "high"
  },
  "project": {
    "creator": 1,
    "creator_info": {
      "avatar": "...",
      "id": 1,
      "name": "Steve",
      "order_field": 2085161728
    },
    "id": 1,
    "intro": "test intro",
    "name": "test project",
    "org_id": 1,
    "person_in_charge": 1,
    "person_in_charge_info": {
      "avatar": "...",
      "id": 1,
      "name": "Steve",
      "order_field": 2085161728
    }
  },
  "project_id": 0,
  "spent_hours": 0,
  "status": {
    "id": 1,
    "is_system": 1,
    "name": "ready"
  },
  "subject": "hello",
  "tag": [
    {
      "id": 5,
      "name": "hi",
      "project_id": 7
    }
  ],
  "tag_id": 0
}
```

## 更新任务

```javascript
ORG API: PATCH /orgs/:org_id/project/tasks/:task_id
```

__参数：__

```javascript
{
  "assignee": 9,
  "assignee_info": {
    "avatar": "...",
    "id": 9,
    "name": "Steve",
    "order_field": 2085161728
  },
  "content": "task content",
  "date_due": 1398755714,
  "expected_hours": 10,
  "is_completed": 1,
  "priority": 2,
  "spent_hours": 2,
  "status": 1,
  "subject": "task subject",
  "tags": [
    "red",
    "green"
  ]
}
```

__返回：__

```javascript
{
  "assignee": 2,
  "assignee_info": {
    "avatar": "...",
    "id": 2,
    "name": "Steve",
    "order_field": 2085161728
  },
  "attachments": [
    {
      "creator": 1,
      "creator_info": {
        "avatar": "...",
        "id": 1,
        "name": "Steve",
        "order_field": 2085161728
      },
      "filename": "exim-filter.pdf",
      "filepath": "1/2014-07-16/26/f_2.pdf",
      "filesize": 101338,
      "id": 1,
      "mimetype": "application/pdf",
      "task_id": 1
    }
  ],
  "content": "moto",
  "creator": 1,
  "creator_info": {
    "avatar": "...",
    "id": 1,
    "name": "Steve",
    "order_field": 2085161728
  },
  "date_added": 1399268928,
  "date_completed": 0,
  "date_due": 1399273928,
  "expected_hours": 0,
  "id": 1,
  "org_id": 1,
  "priority": {
    "color": 16711680,
    "id": 2,
    "is_system": 1,
    "name": "high"
  },
  "project": {
    "creator": 1,
    "creator_info": {
      "avatar": "...",
      "id": 1,
      "name": "Steve",
      "order_field": 2085161728
    },
    "id": 1,
    "intro": "test intro",
    "name": "test project",
    "org_id": 1,
    "person_in_charge": 1,
    "person_in_charge_info": {
      "avatar": "...",
      "id": 1,
      "name": "Steve",
      "order_field": 2085161728
    }
  },
  "project_id": 0,
  "spent_hours": 0,
  "status": {
    "id": 1,
    "is_system": 1,
    "name": "ready"
  },
  "subject": "hello",
  "tag": [
    {
      "id": 5,
      "name": "v1",
      "project_id": 7
    }
  ],
  "tag_id": 0
}
```

## 更新任务排序

```javascript
ORG API: PATCH /orgs/:org_id/project/tasks/:task_id1[,task_id2,task_id3,...]/order
```

将 URL 指定的任务排到给定参数的任务之前/之后，参数为空，表示排到最前/最后

__参数：__

```javascript
{
  "order": "before",
  "task_id": 2
}
```

## 删除任务

```javascript
ORG API: DELETE /orgs/:org_id/project/tasks/:task_id
```

## 任务列表

```javascript
ORG API: GET /orgs/:org_id/project/tasks
```

__示例：__

```javascript
// 按照任务的创建者creator，负责人assignee，完成状态is_completed，进行过滤，按创建时间date_added倒序排序
ORG API: GET /orgs/:org_id/project/tasks?creator=2&assignee=3&is_completed=1&order_by=-date_added

// 按照项目，任务的创建时间过滤任务
ORG API: GET /orgs/:org_id/project/tasks?project_id=1&date_added[start]=1398826043&date_added[end]=1398755714
```

__参数：__

```javascript
// 过滤参数
creator         // 任务创建者
assignee        // 任务负责人
project_id      // 任务所属项目
tag_id          // 任务所属标签
//creator、assignee、project_id、tag_id 可指定多个，例：creator=1&creator=3，多个相同参数表示逻辑"或"的关系

key_tag_id  	// 任务所属标签，指定多个表示逻辑"与"的关系

is_completed    // 任务完成状态
date_added      // 任务创建时间
date_due        // 任务到期时间
date_completed  // 任务完成时间
status			// 任务状态，status_id
priority		// 任务优先级，priority_id


// 翻页参数
pn          // 页码
ps          // 翻页大小

// 排序参数
id              // 主键
date_added      // 创建时间
date_due        // 到期时间
date_completed  // 完成时间
order           // 用户自定义排序
```

__返回：__

```javascript
[
  {
    "assignee": 2,
    "assignee_info": {
      "avatar": "...",
      "id": 2,
      "name": "Steve",
      "order_field": 2085161728
    },
    "attachments": [
      {
        "creator": 1,
        "creator_info": {
          "avatar": "...",
          "id": 1,
          "name": "Steve",
          "order_field": 2085161728
        },
        "filename": "exim-filter.pdf",
        "filepath": "1/2014-07-16/26/f_2.pdf",
        "filesize": 101338,
        "id": 1,
        "mimetype": "application/pdf",
        "task_id": 1
      }
    ],
    "content": "moto",
    "creator": 1,
    "creator_info": {
      "avatar": "...",
      "id": 1,
      "name": "Steve",
      "order_field": 2085161728
    },
    "date_added": 1399268928,
    "date_completed": 0,
    "date_due": 1399273928,
    "expected_hours": 0,
    "id": 1,
    "org_id": 1,
    "priority": {
      "color": 16711680,
      "id": 2,
      "is_system": 1,
      "name": "high"
    },
    "project": {
      "creator": 1,
      "creator_info": {
        "avatar": "...",
        "id": 1,
        "name": "Steve",
        "order_field": 2085161728
      },
      "id": 1,
      "intro": "test intro",
      "name": "test project",
      "org_id": 1,
      "person_in_charge": 1,
      "person_in_charge_info": {
        "avatar": "...",
        "id": 1,
        "name": "Steve",
        "order_field": 2085161728
      }
    },
    "project_id": 0,
    "spent_hours": 0,
    "status": {
      "id": 1,
      "is_system": 1,
      "name": "ready"
    },
    "subject": "hello",
    "tag": [
      {
        "id": 5,
        "name": "v1",
        "project_id": 7
      }
    ],
    "tag_id": 0
  }
]
```

## 任务操作记录

```javascript
ORG API: GET /orgs/:org_id/project/tasks/:task_id/operations
```

__参数：给定 page（默认1），count（默认10），则取第page页count条数据。__

```javascript
operation_code定义：
CREATE_TASK = 100
UPDATE_TASK_ATTRIBUTE = 200
ADD_ATTACHMENT = 300
DEL_ATTACHMENT = 301
ADD_TAG = 400
DEL_TAG = 401
```
__返回：__

```javascript
[
  {
    "content": null,
    "create_time": 1430778770,
    "id": 3,
    "operation_code": 100,
    "operator": {
      "avatar": "...",
      "id": 1,
      "name": "Jacky"
    }
  },
  {
    "content": {
      "after": "task content2",
      "before": "task content",
      "field": "content"
    },
    "create_time": 1430780206,
    "id": 5,
    "operation_code": 200,
    "operator": {
      "avatar": "...",
      "id": 2,
      "name": "Lucy"
    }
  },
  {
    "content": {
      "after": 3,
      "before": 2,
      "field": "spent_hours"
    },
    "create_time": 1430780258,
    "id": 6,
    "operation_code": 200,
    "operator": {
      "avatar": "...",
      "id": 3,
      "name": "Steve"
    }
  },
  {
    "content": {
      "attachment": 214,
      "filename": "test.png"
    },
    "create_time": 1430781017,
    "id": 11,
    "operation_code": 300,
    "operator": {
      "avatar": "...",
      "id": 4,
      "name": "Jorge"
    }
  },
  {
    "content": {
      "filename": "test.png"
    },
    "create_time": 1430781115,
    "id": 12,
    "operation_code": 301,
    "operator": {
      "avatar": "...",
      "id": 3,
      "name": "Steve"
    }
  },
  {
    "content": {
      "name": "Java",
      "tag": 14
    },
    "create_time": 1430781017,
    "id": 13,
    "operation_code": 400,
    "operator": {
      "avatar": "...",
      "id": 4,
      "name": "Jorge"
    }
  },
  {
    "content": {
      "name": "Java"
    },
    "create_time": 1430781915,
    "id": 14,
    "operation_code": 401,
    "operator": {
      "avatar": "...",
      "id": 3,
      "name": "Steve"
    }
  },
  {
    "content": {
      "after": 3,
      "after_info": {
        "avatar": "...",
        "id": 3,
        "name": "alice"
      },
      "before": 2,
      "before_info": {
        "avatar": "...",
        "id": 2,
        "name": "bob"
      },
      "field": "assignee"
    },
    "create_time": 1430780416,
    "id": 18,
    "operation_code": 200,
    "operator": {
      "avatar": "...",
      "id": 2,
      "name": "Lucy"
    }
  },
  {
    "content": {
      "after": 1,
      "before": 0,
      "field": "is_completed"
    },
    "create_time": 1430780445,
    "id": 19,
    "operation_code": 200,
    "operator": {
      "avatar": "...",
      "id": 3,
      "name": "Steve"
    }
  }
]
```

## 给任务添加附件

```javascript
ORG API: POST /orgs/:org_id/project/tasks/:task_id/attachments
```

__参数：__

```javascript
[
  {
    "bfs_file_id": 11,
    "name": "doc.pdf"
  }
]
```

__返回：__

```javascript
[
  {
    "creator": 1,
    "creator_info": {
      "avatar": "...",
      "id": 1,
      "name": "Steve",
      "order_field": 2085161728
    },
    "filename": "doc.pdf",
    "filepath": "1/2014-07-08/81/f.pdf",
    "filesize": 101338,
    "id": 1,
    "task_id": 1
  }
]
```

## 删除任务附件

```javascript
ORG API: DELETE /orgs/:org_id/project/tasks/:task_id/attachments/:attachment_id
```

## 下载任务附件

```javascript
ORG API: GET /orgs/:org_id/project/tasks/:task_id/attachments/:attachment_id/attachment
```

__返回：附件内容。__

## 评论任务

```javascript
ORG API: POST /orgs/:org_id/project/tasks/:task_id/comments
```

__参数：__

```javascript
{
  "content": "hello"
}
```

__返回：__

```javascript
{
  "content": "hello",
  "creator": 9,
  "creator_info": {
    "avatar": "...",
    "id": 9,
    "name": "Steve",
    "order_field": 2085161728
  },
  "date_added": 1398827159,
  "id": 1,
  "target": 1
}
```

## 获取任务评论

```javascript
ORG API: GET /orgs/:org_id/project/tasks/:task_id/comments?start=:start&ps=10
```

__参数：获取小于 start 的最多 ps 条评论。__

__返回：__

```javascript
[
  {
    "content": "hello moto",
    "creator": 9,
    "creator_info": {
      "avatar": "...",
      "id": 9,
      "name": "Steve",
      "order_field": 2085161728
    },
    "date_added": 1398827159,
    "id": 1,
    "target": 1
  }
]
```

## 删除任务评论

```javascript
ORG API: DELETE /orgs/:org_id/project/tasks/:task_id/comments/:comment_id
```

## 新增任务状态

```javascript
ORG API: POST /orgs/:org_id/project/projects/:project_id/status
```

__参数：__

```javascript
{
  "name": "handled"
}
```

__返回：__

```javascript
{
  "id": 1,
  "is_system": 0,
  "name": "handled"
}
```

## 获取任务状态列表

```javascript
ORG API: GET /orgs/:org_id/project/projects/:project_id/status
```

__返回：__

```javascript
[
  {
    "id": 3,
    "is_system": 0,
    "name": "a"
  },
  {
    "id": 1,
    "is_system": 1,
    "name": "b"
  },
  {
    "id": 2,
    "is_system": 1,
    "name": "c"
  }
]
```
## 删除任务状态

```javascript
ORG API: DELETE /orgs/:org_id/project/projects/:project_id/status/:status_id
```

## 更新已有的任务状态

```javascript
ORG API: PATCH /orgs/:org_id/project/projects/:project_id/status/:status_id
```

__参数：__

```javascript
{
  "name": "handled"
}
```

## 新增任务优先级

```javascript
ORG API: POST /orgs/:org_id/project/projects/:project_id/priority
```
color = 16711680 (0xff0000)使用十进制int传参和解析。

__参数：__

```javascript
{
  "color": 16711680,
  "name": "very high"
}
```

__返回：__

```javascript
{
  "color": 16711680,
  "id": 1,
  "is_system": 0,
  "name": "very high"
}
```

## 获取任务优先级列表

```javascript
ORG API: GET /orgs/:org_id/project/projects/:project_id/priority
```

__返回：__

```javascript
[
  {
    "color": 16711681,
    "id": 3,
    "is_system": 0,
    "name": "a"
  },
  {
    "color": 16711682,
    "id": 1,
    "is_system": 1,
    "name": "b"
  },
  {
    "color": 16711683,
    "id": 2,
    "is_system": 1,
    "name": "c"
  }
]
```
## 删除任务优先级

```javascript
ORG API: DELETE /orgs/:org_id/project/projects/:project_id/priority/:priority_id
```

## 更新已有的任务优先级

```javascript
ORG API: PATCH /orgs/:org_id/project/projects/:project_id/priority/:priority_id
```

__参数：__

```javascript
{
  "color": 16711680,
  "name": "abc"
}
```


# 文件

## 创建目录

```javascript
ORG API: POST /orgs/:org_id/file/files
```

__参数：__

```javascript
{
  "name": "/path/to/"
}
```

__返回：__

```javascript
{
  "contain_dirs": 0,
  "creator": 4,
  "creator_info": {
    "avatar": "...",
    "id": 4,
    "name": "Steve",
    "order_field": 2085161728
  },
  "date_updated": 1399517210,
  "dir_is_empty": 1,
  "filepath": "",
  "fullpath": "/path/to",
  "id": 10001,
  "is_file": 0,
  "mimetype": "application/x-directory",
  "name": "to",
  "parent": 0,
  "size": 0
}
```

## 创建文件

```javascript
ORG API: POST /orgs/:org_id/file/files
```

__参数：__

```javascript
{
  "bfs_file_id": 1,
  "name": "/hello/moto/path.pdf",
  "replace": 1
}
```

__返回：__

```javascript
{
  "contain_dirs": 0,
  "creator": 4,
  "creator_info": {
    "avatar": "...",
    "id": 4,
    "name": "Steve",
    "order_field": 2085161728
  },
  "date_updated": 1399517210,
  "dir_is_empty": 1,
  "filepath": "",
  "fullpath": "/path/to.jpg",
  "id": 10002,
  "is_file": 1,
  "mimetype": "image/jpeg",
  "name": "to.jpg",
  "parent": 2,
  "size": 1202
}
```

## 根据文件名搜索文件

```javascript
ORG API: GET /orgs/:org_id/file/files?fullpath=:fullpath
```

__返回：__

```javascript
{
  "contain_dirs": 0,
  "creator": 4,
  "creator_info": {
    "avatar": "...",
    "id": 4,
    "name": "Steve",
    "order_field": 2085161728
  },
  "date_updated": 1399517210,
  "dir_is_empty": 1,
  "filepath": "",
  "fullpath": "/path/to.jpg",
  "id": 10002,
  "is_file": 1,
  "mimetype": "image/jpeg",
  "name": "to.jpg",
  "parent": 2,
  "size": 1202
}
```

## 访问目录

```javascript
ORG API: GET /orgs/:org_id/file/files/:parent/children
```

```javascript
ORG API: GET /orgs/:org_id/file/files?dir=:dir
```

__参数：指定 dir_only=1 只返回目录。__

__返回：__

```javascript
[
  {
    "contain_dirs": 0,
    "creator": 4,
    "creator_info": {
      "avatar": "...",
      "id": 4,
      "name": "Steve",
      "order_field": 2085161728
    },
    "date_updated": 1399517210,
    "dir_is_empty": 1,
    "filepath": "",
    "fullpath": "/path/to",
    "id": 10001,
    "is_file": 0,
    "mimetype": "application/x-directory",
    "name": "to",
    "parent": 0,
    "size": 0
  },
  {
    "contain_dirs": 0,
    "creator": 4,
    "creator_info": {
      "avatar": "...",
      "id": 4,
      "name": "Steve",
      "order_field": 2085161728
    },
    "date_updated": 1399517210,
    "dir_is_empty": 1,
    "filepath": "",
    "fullpath": "/path/to.jpg",
    "id": 10002,
    "is_file": 1,
    "mimetype": "image/jpeg",
    "name": "to.jpg",
    "parent": 2,
    "size": 1202
  }
]
```

## 重命名文件/目录

```javascript
ORG API: PATCH /orgs/:org_id/file/files/:file_id
```

__参数：__

```javascript
{
  "name": "/path/to/new-name"
}
```

## 移动文件/目录

```javascript
ORG API: PATCH /orgs/:org_id/file/files/:file_id1[,:file_id2,:file_id3,......]
```

__参数：__

```javascript
{
  "parent": "/path/to/new-dir"
}
```

## 删除文件/目录

```javascript
ORG API: DELETE /orgs/:org_id/file/files/:file_id1[,:file_id2,:file_id3,......]
```

## 获取文件信息

```javascript
ORG API: GET /orgs/:org_id/file/files/:file_id1[,:file_id2,:file_id3,......]
```

__返回：见文件列表返回值。__

## 下载文件

```javascript
ORG API: GET /orgs/:org_id/file/files/:file_id/attachment
```

__返回：文件内容。__

## 批量下载文件

```javascript
ORG API: GET /orgs/:org_id/file/files/:file_id1[,:file_id2,:file_id3,......]/bundle
```

__返回：zip 压缩的文件内容。__


# 文件（带权限检查）
注:

* 请求前缀：https://api.starfish.im/v2
* 所有请求参数中，parent=0 表示根目录

## 常量定义
协作者类型(owner_type)：

* TYPE_ORG_MEMBER = 0
* TYPE_DEPARTMENT = 1
* TYPE_DISCUSSION_GROUP = 2

角色类型(role)：

* NONE = 0
* CONTROLLER = 1
* EDITOR = 2
* VIEWER = 3


## 创建目录

```javascript
ORG API: POST /orgs/:org_id/file/files
```

__参数：__

```javascript
{
  "name": "test folder",
  "parent": 8,
  "roles": [
    {
      "name": "Steve Jobs",
      "owner": 1,
      "owner_type": 0,
      "role": 2
    }
  ]
}
```

__返回：__

```javascript
{
  "all_parents": {
    "ids": [
      7,
      8
    ],
    "names": [
      "folder id 7",
      "folder id 8"
    ]
  },
  "creator": 4,
  "creator_info": {
    "avatar": "...",
    "id": 4,
    "name": "Steve",
    "order_field": 2085161728
  },
  "date_updated": 1399517210,
  "id": 9,
  "is_file": 0,
  "mimetype": "application/x-directory",
  "name": "test folder",
  "parent": 8,
  "permissions": [
    "control",
    "delete",
    "download",
    "preview",
    "rename",
    "send",
    "upload",
    "view"
  ],
  "size": 0
}
```

## 创建文件

```javascript
ORG API: POST /orgs/:org_id/file/files
```

__参数：__

```javascript
{
  "bfs_file_id": 1,
  "name": "img file",
  "parent": 9,
  "replace": 1,
  "roles": [
    {
      "name": "Steve Jobs",
      "owner": 1,
      "owner_type": 1,
      "role": 3
    }
  ]
}
```

__返回：__

```javascript
{
  "all_parents": {
    "ids": [
      7,
      8,
      9
    ],
    "names": [
      "folder id 7",
      "folder id 8",
      "folder id 9"
    ]
  },
  "creator": 4,
  "creator_info": {
    "avatar": "...",
    "id": 4,
    "name": "Steve",
    "order_field": 2085161728
  },
  "date_updated": 1399517210,
  "id": 10,
  "is_file": 1,
  "mimetype": "image/jpeg",
  "name": "test folder",
  "parent": 9,
  "permissions": [
    "control",
    "delete",
    "download",
    "preview",
    "rename",
    "send",
    "upload",
    "view"
  ],
  "size": 1202
}
```

## 访问目录

```javascript
ORG API: GET /orgs/:org_id/file/files
```

__参数：

* 指定 parent=:dir_id 返回目录下的子目录和文件。
* 指定 dir_only=1 只返回目录。
* 指定as_role 只返回拥有指定角色的列表。例如： as_role=2
* 指定perm 只返回拥有指定权限的列表。例如： perm=upload
* 指定 order_by返回文件和目录排序，可选：is_file, -date_updated, name，支持"-"表示倒序。
* 分页参数：页码page=1，每页count=65536，为默认值
__

__返回：__

```javascript
{
  "all_parents": {
    "ids": [
      7,
      8
    ],
    "names": [
      "folder id 7",
      "folder id 8"
    ]
  },
  "children": [
    {
      "creator": 4,
      "creator_info": {
        "avatar": "...",
        "id": 4,
        "name": "Steve",
        "order_field": 2085161728
      },
      "date_updated": 1399517210,
      "id": 10001,
      "is_file": 0,
      "mimetype": "application/x-directory",
      "name": "to",
      "parent": 9,
      "permissions": [
        "download",
        "preview",
        "rename",
        "send",
        "upload",
        "view"
      ],
      "size": 0
    },
    {
      "creator": 4,
      "creator_info": {
        "avatar": "...",
        "id": 4,
        "name": "Steve",
        "order_field": 2085161728
      },
      "date_updated": 1399517210,
      "id": 10002,
      "is_file": 1,
      "mimetype": "image/jpeg",
      "name": "to.jpg",
      "parent": 9,
      "permissions": [
        "download",
        "preview",
        "send",
        "view"
      ],
      "size": 1202
    }
  ],
  "creator": 4,
  "creator_info": {
    "avatar": "...",
    "id": 4,
    "name": "Steve",
    "order_field": 2085161728
  },
  "date_updated": 1399517210,
  "id": 9,
  "is_file": 0,
  "mimetype": "application/x-directory",
  "name": "test folder",
  "parent": 8,
  "permissions": [
    "control",
    "delete",
    "download",
    "preview",
    "rename",
    "send",
    "upload",
    "view"
  ],
  "size": 0
}
```

## 重命名文件/目录

```javascript
ORG API: PATCH /orgs/:org_id/file/files/:file_id
```

__参数：__

```javascript
{
  "name": "new-name"
}
```

## 移动文件/目录

```javascript
ORG API: PATCH /orgs/:org_id/file/files/:file_id1[,:file_id2,:file_id3,......]
```

__参数：__

```javascript
{
  "parent": 10,
  "replace": 0
}
```
__返回：__

错误码：

* 4: permission denied
* 42: file exists
* 59: dir exists
* 71: file dir replace error
```javascript
[
  {
    "errcode": 0,
    "id": 1
  },
  {
    "errcode": 71,
    "id": 2
  }
]
```

## 删除文件/目录

```javascript
ORG API: DELETE /orgs/:org_id/file/files/:file_id1[,:file_id2,:file_id3,......]
```

## 获取文件信息

```javascript
ORG API: GET /orgs/:org_id/file/files/:file_id1[,:file_id2,:file_id3,......]
```

__返回：见文件列表返回值。__

## 下载文件

```javascript
ORG API: GET /orgs/:org_id/file/files/:file_id/attachment
```

__返回：文件内容。__

## 批量下载文件

```javascript
ORG API: GET /orgs/:org_id/file/files/:file_id1[,:file_id2,:file_id3,......]/bundle
```

__返回：zip 压缩的文件内容。__

## 添加/修改权限角色

```javascript
ORG API: POST /orgs/:org_id/file/roles
```

__参数：__

```javascript
{
  "file_id": 8,
  "roles": [
    {
      "name": "Steve Jobs",
      "owner": 1,
      "owner_type": 0,
      "role": 2
    }
  ]
}
```

## 获取权限角色

```javascript
ORG API: GET /orgs/:org_id/file/roles
```

__参数：
指定 file_id=:file_id 对应目录和文件id。
指定 q='Steve' 搜索名字中包含关键子的协作者。
指定 role 仅返回对应角色类型。
__

__返回：__

```javascript
[
  {
    "file": 9,
    "id": 3,
    "name": "SteveJobs",
    "owner": 1,
    "owner_info": {
      "avatar": "...",
      "id": 1,
      "name": "Steve"
    },
    "owner_typ": 0,
    "role": 1
  },
  {
    "file": 9,
    "id": 4,
    "name": "Cloud Department",
    "owner": 2,
    "owner_info": {
      "avatar": "...",
      "id": 2,
      "name": "There"
    },
    "owner_typ": 1,
    "role": 2
  }
]
```

## 检查文件存在
```javascript
ORG API: GET /orgs/:org_id/file/files/check?parent=0&name=test1&name=test2

```
__参数：
指定 parent=:dir_id 检查目录下的子目录和文件。
指定 name检查名字，支持多个name。
注：该接口区别于其他接口，即使没有指定名字文件（目录）的可见权限，也会检查到该文件（目录）。
__

__返回：__
返回值列表中，包含id字段的表示该文件/目录存在。
```javascript
[
  {
    "id": "1",
    "is_file": 0,
    "name": "test1"
  },
  {
    "name": "test2"
  }
]
```



# 管理员

## 添加管理员

```javascript
ORG API: POST /orgs/:org_id/administrators
```

__参数：__

```javascript
{
  "user_id": 1
}
```

__返回：__

```javascript
{
  "expires_at": 1507860637,
  "role": "admin",
  "user_id": 2
}
```

## 删除管理员

```javascript
ORG API: DELETE /orgs/:org_id/administrators/:user_id
```

## 获取管理员列表

```javascript
ORG API: GET /orgs/:org_id/administrators
```

__返回：__

```javascript
[
  {
    "expires_at": 1507860637,
    "role": "admin",
    "user_id": 2
  }
]
```

## 获取管理员信息

```javascript
ORG API: GET /orgs/:org_id/administrators/:user_id
```

__返回：__

```javascript
{
  "expires_at": 1507860637,
  "role": "admin",
  "user_id": 2
}
```

# 其他

## 获取最新版本号

```javascript
NORMAL API: GET /versions/latest?platform=:platform&code=:code&debug=0
```

__参数：__

__platform 常量定义__

```javascript
PLATFORM_WINDOWS = 0
PLATFORM_LINUX = 1
PLATFORM_MAC = 2
PLATFORM_ANDROID = 3
PLATFORM_IOS = 4
```

__code 常量定义__

官方版本：starfish，云学堂版本：yxt

__返回：__

```javascript
{
  "id": 1,
  "package_url": "http://some url",
  "platform": 4,
  "release_notes": "some features...",
  "version": "1.1.2"
}
```

## 提交反馈

```javascript
NORMAL API: POST /feedbacks
```

__参数：__

```javascript
{
  "content": "hello moto"
}
```

__返回：__

```javascript
{
  "content": "hello moto",
  "date_added": 1397019273,
  "id": 1,
  "user_id": 4
}
```

## 检查当前用户权限

```javascript
NORMAL API: POST /self_permissions
```

__permission 常量定义__

```javascript
PERMISSION_CREATE = 1
PERMISSION_VIEW = 2
PERMISSION_UPDATE = 4
PERMISSION_DELETE = 8
```

__参数：__

```javascript
{
  "permissions": [
    {
      "permission": 1,
      "resource": {
        "args": {
          "org_id": 1
        },
        "desc": "project-app-projects-list"
      }
    },
    {
      "permission": 1,
      "resource": {
        "args": {
          "org_id": 0
        },
        "desc": "sessions-list"
      }
    }
  ]
}
```

__返回：__

```javascript
[
  {
    "is_allowed": true,
    "permission": 1,
    "resource": {
      "args": {
        "org_id": 1
      },
      "desc": "project-app-projects-list"
    }
  },
  {
    "is_allowed": true,
    "permission": 1,
    "resource": {
      "args": {
        "org_id": 0
      },
      "desc": "sessions-list"
    }
  }
]
```

## 错误编码、错误消息

```javascript
NORMAL API: GET /i18n/properties
```

__返回：__

```javascript
{
  "0": "OK",
  "1": "duplicate phone number",
  "2": "bad username or password"
}
```

## 检查邀请码

```javascript
NORMAL API: GET /v1/invitation_codes?code=:code
```

__返回：__

// 邀请码可用

```javascript
{
  "code": "3hfyt"
}
```

// 邀请码不可用

```javascript
null
```

# 全局搜索

## 搜索

```javascript
ORG API: GET /orgs/:org_id/search?q=hello&type=1&page=1&count=5&highlight=1
```
```javascript

搜索及返回类型type:
MESSAGE = 1
CONTACT = 100
ORG_MEMBER = 101
DISCUSS_GROUP = 102
DEPARTMENT = 103
```
__参数：__

* 关键字q="your keyword"
* 指定搜索类型type, 可选类型如上文定义。
* 分页参数：页码page=1，每页count=10，为默认值。
* highlight返回高亮字段；0不返回。（highlight值不同，对应着不同的前端设计需求）
* conversation=:conversation_id指定conversation内搜索。
* 仅当搜索类型为MESSAGE时，time_order=1指定返回结果按照“时间倒叙”排列。否则，按匹配度优先排序。
* is_detail：默认为0，当is_detail=1，并且type=ORG_MEMBER或DEPARTMENT，返回的source内包括详细信息（同用户详情、部门详情接口返回值）。

__返回：__

搜索类型为MESSAGE时：

```javascript
{
  "data": [
    {
      "content": [
        "Say <em style=\"color: red;font-style: normal;font-weight: bold;\">hello</em> to everyone!"
      ],
      "id": 4050211238809908700,
      "source": {
        "conversation_id": 4997,
        "create_time": "2015-04-20 18:26:44",
        "create_timestamp": 1429525604,
        "id": 4050211238809908700,
        "peer": {
          "avatar": "...",
          "id": 5,
          "name": "To",
          "order_field": 2085161728
        },
        "peer_type": 1,
        "src": {
          "avatar": "...",
          "id": 3,
          "name": "From",
          "order_field": 2085161728
        },
        "src_type": 1,
        "type": 2,
        "user_message_id": 658267
      },
      "type": 1
    }
  ],
  "total": 20
}
```

搜索类型为CONTACT时：
```javascript
{
  "data": [
    {
      "content": [
        "<em style=\"color:red;font-style:normal ;font-weight:bold;\">Michael</em>Jordan"
      ],
      "id": "6",
      "source": {
        "avatar": "...",
        "id": 6,
        "name": "Michael Jordan",
        "work_mail": "jordan@nba.com"
      },
      "type": 101
    },
    {
      "content": [
        "<em style=\"color:red;font-style:normal ;font-weight:bold;\">Michael</em>Jackson"
      ],
      "id": "9",
      "source": {
        "avatar": "...",
        "id": 9,
        "name": "Michael Jackson",
        "work_mail": ""
      },
      "type": 101
    }
  ],
  "total": 2
}
```
## 搜索消息，按conversation返回消息数目

```javascript
ORG API: GET /orgs/:org_id/search/conversations?q=hello&highlight=1
```

__参数：__

* 关键字q="your keyword"
* highlight返回高亮字段，当返回值中包含content时有效。


__返回：__

```javascript
{
  "data": [
    {
      "content": [
        "Say <em style=\"color: red;font-style: normal;font-weight: bold;\">hello</em> to everyone!"
      ],
      "conversation_id": 4991,
      "count": 1,
      "create_time": "2015-04-20 18:26:44",
      "create_timestamp": 1429525604,
      "id": 4050211238809908700,
      "peer": {
        "avatar": "...",
        "id": 5,
        "name": "To",
        "order_field": 2085161728
      },
      "peer_type": 1,
      "src": {
        "avatar": "...",
        "id": 3,
        "name": "From",
        "order_field": 2085161728
      },
      "src_type": 1,
      "type": 2,
      "user_message_id": 658267
    },
    {
      "conversation_id": 4992,
      "count": 30,
      "peer": {
        "avatar": "...",
        "id": 7,
        "name": "To",
        "order_field": 2085161728
      },
      "peer_type": 1
    }
  ],
  "total": 31
}
```

## 搜索项目成员

```javascript
ORG API: GET /orgs/:org_id/search/project/members?q=Michael&project=:project_id&page=1&count=5&highlight=1
```

__参数：__

* 关键字q="keyword"
* 分页参数：页码page=1，每页count=10，为默认值。
* highlight返回高亮字段；0不返回。（highlight值不同，对应着不同的前端设计需求）
* project=:project_id指定project_id搜索成员。

__返回：__

```javascript
{
  "data": [
    {
      "content": [
        "<em style=\"color:red;font-style:normal ;font-weight:bold;\">Michael</em>Jordan"
      ],
      "id": "6",
      "source": {
        "avatar": "...",
        "id": 6,
        "name": "Michael Jordan"
      },
      "type": 101
    },
    {
      "content": [
        "<em style=\"color:red;font-style:normal ;font-weight:bold;\">Michael</em>Jackson"
      ],
      "id": "9",
      "source": {
        "avatar": "...",
        "id": 9,
        "name": "Michael Jackson"
      },
      "type": 101
    }
  ],
  "total": 2
}
```

## 搜索项目任务

```javascript
ORG API: GET /orgs/:org_id/search/project/tasks?q=android&project=:project_id&page=1&count=5&highlight=1
```

__参数：__

* 关键字q="keyword"
* 分页参数：页码page=1，每页count=10，为默认值。
* highlight返回高亮字段；0不返回。（highlight值不同，对应着不同的前端设计需求）
* project=:project_id指定project_id搜索成员。

__返回：__

```javascript
{
  "data": [
    {
      "content": [
        "<em style=\"color:red;font-style:normal ;font-weight:bold;\">android</em>task 1"
      ],
      "id": "7509",
      "source": {
        "assignee": 558,
        "id": 7509,
        "project_id": 1
      },
      "type": 200
    },
    {
      "content": [
        "<em style=\"color:red;font-style:normal ;font-weight:bold;\">android</em>task 2"
      ],
      "id": "4887",
      "source": {
        "assignee": 558,
        "id": 4887,
        "project_id": 1
      },
      "type": 200
    }
  ],
  "total": 2
}
```

# 应用中心

__应用定义：__

* 项目系统 PROJECT = 1
* 文件系统 FILE = 2
* 邮件系统 MAIL = 3

## 安装/卸载应用

```javascript
ORG API: POST /orgs/:org_id/apps/global
```

__参数：__
```javascript
安装：install = 1
卸载：install = 0

{
"app": 2,
"install":1
}
```

## 已安装应用列表

```javascript
ORG API: GET /orgs/:org_id/apps/global
```

__返回：__
```javascript
[
  {
    "app": 1,
    "create_time": "2015-04-20T18:26:44",
    "create_timestamp": 1429525604,
    "creator": 13,
    "creator_info": {
      "avatar": "...",
      "id": 13,
      "name": "Steve",
      "order_field": 2085161728
    },
    "is_install": 1
  },
  {
    "app": 2,
    "create_time": "2015-04-20T18:26:45",
    "create_timestamp": 1429525605,
    "creator": 13,
    "creator_info": {
      "avatar": "...",
      "id": 13,
      "name": "Steve",
      "order_field": 2085161728
    },
    "is_install": 1
  }
]
```

## 添加/删除应用导航

```javascript
ORG API: POST /orgs/:org_id/members/:member_id/apps
```

__参数：__
```javascript
添加：navi = 1
删除：navi = 0

{
"app": 2,
"navi":1
}
```

## 导航应用列表

```javascript
ORG API: GET /orgs/:org_id/members/:member_id/apps
```

__返回：__
```javascript
[
  2,
  1,
  3
]
```

# 云学堂

## 获取公钥

```javascript
NORMAL API: GET /yxt/pub
```

__说明：__
客户端根据返回的public_key使用RSA算法加密password，再转换以十六进制字符串传输。
hex( RSA(public_key, password) )

__返回：__

```javascript
{
  "public_key": "-----BEGIN PUBLIC KEY----- MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAut5cMpQiDvCB/rFJ/wz8 9kTbAtl7visP58Px9RcvhW8BT+TeyVZvJEBp/8i2Zw6NFGLn0Abi47vJDT/SBaqj l/Oc/n1wwY+ZLS1R4gseXlCaX6gMbZifII6z4WKLWKvyT7nrJlR9HVpRRbHwKM4d odRTwfKq29qajJ3tV7flHMGIZ/OLvOy4Ym4MuGzyDqZbxy+e0GppBf7OfkjxaSpU 2xkH+7w3j51umFxrdOGGILrAHbv8ncrBczm64d/3EG2npGvnijoWXrGJqx3d0jbG YamidkCOL4EHeAxw8V/+axPABdFPFm5uBGk8fMn4ouyyH3sw7TlivDBNUjJzIial HQIDAQAB -----END PUBLIC KEY----- "
}
```

## 用户登陆

```javascript
NORMAL API: POST /yxt/sessions
```

__参数：__
// domain 必填
// token验证，或者username+password验证；二选其一
// 当提供username+password时， password为明文密码（优先），encrypted_password为RSA加密过的password，二者选其一。

使用token:
```javascript
{
  "agent_desc": "",
  "auto_signin": 1,
  "device_id": "356489051607096",
  "domain": "yxt",
  "token": "AAA-BBB-111-222"
}
```

使用username+password:
```javascript
{
  "agent_desc": "",
  "auto_signin": 1,
  "device_id": "356489051607096",
  "domain": "yxt",
  "password": "foobar95275",
  "username": "9527"
}
```

使用username+encrypted_password:
```javascript
{
  "agent_desc": "",
  "auto_signin": 1,
  "device_id": "356489051607096",
  "domain": "yxt",
  "encrypted_password": "5dbd2fa0a093f745e...",
  "username": "9527"
}
```
__返回：__

```javascript
{
  "bfs_url": "bfs.starfish.im",
  "domain": "yxt",
  "pull_messages": 1,
  "remember_token": "rn9l61cyacna4tffff12k7kk",
  "session_key": "lbfpvmjtl6y5p0epwna6j7652dechjvv",
  "user_id": 1
}
```

## 云学堂创建/更新组织

```javascript
NORMAL API: POST /yxt/orgs
```

__参数：__

```javascript
{
  "avatar": "http://***.jpg",
  "intro": "introduction",
  "name": "yunxuetang",
  "uuid": "71028353-7246-463f-ab12-000000000012"
}
```


__返回：__
errcode: 0:ok, 5:internal error, 75:bad request parameters

```javascript
{
  "data": {
    "avatar": "http://***.jpg",
    "intro": "introduction",
    "name": "yunxuetang",
    "uuid": "71028353-7246-463f-ab12-000000000012"
  },
  "errcode": 0
}
```

## 云学堂删除组织

```javascript
NORMAL API: DELETE /yxt/orgs
```

__参数：__

```javascript
{
  "uuid": "71028353-7246-463f-ab12-000000000012"
}
```


__返回：__
errcode: 0:ok, 5:internal error, 75:bad request parameters

```javascript
{
  "data": {
    "uuid": "71028353-7246-463f-ab12-000000000012"
  },
  "errcode": 0
}
```

## 云学堂创建/更新部门

```javascript
NORMAL API: POST /yxt/departments
```

__参数：__

```javascript
{
  "creator_uuid": "88888888-7246-463f-ab12-000000000001",
  "name": "yunxuetang",
  "org_uuid": "11111111-7246-463f-ab12-000000000000",
  "parent_uuid": "71028353-7246-463f-ab12-000000000010",
  "uuid": "71028353-7246-463f-ab12-000000000012"
}
```


__返回：__
errcode: 0:ok, 5:internal error, 75:bad request parameters

```javascript
{
  "data": {
    "creator_uuid": "88888888-7246-463f-ab12-000000000001",
    "name": "yunxuetang",
    "org_uuid": "11111111-7246-463f-ab12-000000000000",
    "parent_uuid": "71028353-7246-463f-ab12-000000000010",
    "uuid": "71028353-7246-463f-ab12-000000000012"
  },
  "errcode": 0
}
```

## 云学堂删除部门

```javascript
NORMAL API: DELETE /yxt/departments
```

__参数：__

```javascript
{
  "org_uuid": "11111111-7246-463f-ab12-000000000000",
  "uuid": "71028353-7246-463f-ab12-000000000012"
}
```


__返回：__
errcode: 0:ok, 5:internal error, 75:bad request parameters

```javascript
{
  "data": {
    "org_uuid": "11111111-7246-463f-ab12-000000000000",
    "uuid": "71028353-7246-463f-ab12-000000000012"
  },
  "errcode": 0
}
```

## 同步账号

```javascript
NORMAL API: POST /yxt/users
```

__参数：__

```javascript
{
  "avatar": "http://***.jpg",
  "department_uuid": "71028353-7246-463f-ab12-000000000010",
  "gender": 1,
  "intro": "introduction",
  "name": "yunxuetang",
  "org_uuid": "11111111-7246-463f-ab12-000000000000",
  "phone": "13812345678",
  "position": "leader",
  "status": 1,
  "user_uuid": "71028353-7246-463f-ab12-000000000012",
  "username": "alice"
}
```


__返回：__
errcode: 0:ok, 5:internal error, 75:bad request parameters

```javascript
{
  "data": {
    "avatar": "http://***.jpg",
    "department_uuid": "71028353-7246-463f-ab12-000000000010",
    "gender": 1,
    "intro": "introduction",
    "name": "yunxuetang",
    "org_uuid": "11111111-7246-463f-ab12-000000000000",
    "phone": "13812345678",
    "position": "leader",
    "user_uuid": "71028353-7246-463f-ab12-000000000012",
    "username": "alice"
  },
  "errcode": 0
}
```


## 从部门移除成员

```javascript
NORMAL API: DELETE /yxt/user-department
```

__参数：__

```javascript
{
  "department_uuid": "71028353-7246-463f-ab12-000000000010",
  "org_uuid": "11111111-7246-463f-ab12-000000000000",
  "user_uuid": "71028353-7246-463f-ab12-000000000012"
}
```


__返回：__
errcode: 0:ok, 5:internal error, 75:bad request parameters

```javascript
{
  "data": {
    "department_uuid": "71028353-7246-463f-ab12-000000000010",
    "org_uuid": "11111111-7246-463f-ab12-000000000000",
    "user_uuid": "71028353-7246-463f-ab12-000000000012"
  },
  "errcode": 0
}
```
