# 说明

* 所有 HTTP 请求响应均为 JSON，UTF-8 编码，需指定 header：

    ```javascript
    Content-type: application/json
    Accept: application/json
    ```

* 请求响应示例：

    成功：

    ```javascript
    {
        "error" {
            "code": 0,
            "msg": "OK"
        }
    }
    ```

    失败：

    ```javascript
    {
        "error" {
            "code": 1,
            "msg": "some message"
        }
    }
    ```

    附带数据：

    ```javascript
    {
        "error" {
            "code": 0,
            "msg": "OK"
        },
        "data": []
    }
    ```

    附带自动登陆信息：

    ```javascript
    {
        "error" {
            "code": 0,
            "msg": "OK"
        },
        "data": [],
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
        "error" {
            "code": 3,
            "msg": "you need sign in"
        }
    }
    ```

    ```javascript
    {
        "error" {
            "code": 4,
            "msg": "permission denied"
        }
    }
    ```

    后面示例不一一说明

* 以下示例省略请求前缀：https://api.starfish.im/v1

* 以下示例省略请求的公共返回信息：error，extra。

* 部分 API 有 Last-Modified 支持，关于 Last-Modified 可以参考：http://www.cyberciti.biz/faq/linux-unix-curl-if-modified-since-command-linux-example/
客户端在发 HTTP 请求时，带上 If-Modified-Since 头，服务器会根据这个时间戳来返回：

    ##### 1）如果客户端内容不是最新的，则返回 200 OK + 正常返回内容 或者

    ##### 2）如果客户端内容是最新的，则返回 304 Not Modified 和空 body

# 账户

## 性别定义

* MALE = 0
* FEMALE = 1
* UNKNOWN = 2

## 用户注册

```javascript
GLOBAL API: POST /users
```

__参数：__

```javascript
{
  "gender": 1,
  "name": "your-name",
  "password": "foobar",
  "phone": "9527",
  "token": {
    "type": 0,
    "value": "9528"
  }
}
```

__注：token 是手机号通过验证得到的验证码，获取 token 的方法见：创建 Token。__

__返回：__

```javascript
{
  "avatar_url": "http://some.url",
  "gender": 1,
  "id": 1,
  "intro": "lilei",
  "name": "lilei",
  "phone": "9527"
}
```

__注：该 API 可以上传一个头像文件，此时不能用 JSON 编码，__
__Content-Type 必须是 multipart/form-data，如果不上传头像，__
__Content-Type 必须是 application/json。__

## 检索用户

```javascript
GLOBAL API: GET /users
```

__参数：__

* 根据手机号检索用户 phone=:phone
* 根据微信 openid 检索用户 openid=:openid

__返回：__

```javascript
{
  "avatar_url": "http://some.url",
  "id": 1,
  "name": "lilei"
}
```

## 获取用户信息

```javascript
GLOBAL API: GET /users/:user_id1[,:user_id2,:user_id3,......]
```

__注：增加 query string：fields=id,name 可以过滤指定的列。__

__返回：__

```javascript
[
  {
    "avatar_url": "http://some.url",
    "gender": 1,
    "id": 1,
    "intro": "lilei",
    "location": "wuhan",
    "name": "lilei",
    "phone": "9527"
  }
]
```

## 更新用户信息

```javascript
GLOBAL API: PATCH /users/:user_id
```

__参数：__

```javascript
{
  "gender": 1,
  "intro": "hello simon",
  "latitude": 31.987935,
  "longitude": 118.747933,
  "name": "simon",
  "password": "foobar2",
  "phone": "9527",
  "token": {
    "type": 1,
    "value": "123456"
  }
}
```

__注：要修改手机号码，需要提供 password 做验证，修改其他字段无需验证。__

__注：该 API 可以更新用户头像，字段名：avatar，头像文件以附件形式上传，此时请求编码格式为：multipart/form-data。__

__注：avatar_url=''，将恢复为系统默认头像。__

__注：如修改密码需提供 original_password。__

__注：如重置密码需要提供 token，创建方式见创建 Token。__

## 设备类型定义

* ANDROID = 1
* IPHONE = 2
* WINDOWS = 7
* MACOSX = 8
* LINUX = 9
* BROWSER = 10

## 获取用户的设备列表

```javascript
GLOBAL API: GET /users/:user_id1[,:user_id2...]/agents
```

__返回：__

```javascript
{
  "1": [
    {
      "desc": "alice iphone",
      "key": "c7b4b54f8dac7cf66e732924964a53f2",
      "online": 1,
      "type": 10
    }
  ],
  "3": [
    {
      "desc": "alice iphone",
      "key": "c7b4b54f8dac7cf66e732924964a53f2",
      "online": 1,
      "type": 10
    }
  ]
}
```

## 删除用户的设备

```javascript
GLOBAL API: DELETE /users/:user_id/agents/:agent_key
```

## 用户登陆

```javascript
GLOBAL API: POST /sessions
```

__参数：__

// 用户名密码登陆

```javascript
{
  "device_id": "356489051607096",
  "password": "foobar95275",
  "phone": "9527"
}
```

// remember_token 登陆

```javascript
{
  "remember_token": "rn9l61cyacna4tffff12k7kk"
}
```

__注：登陆可以传用户名 + 密码，也可以只传remember_token（不需要传phone, password 等），记住remember_token 每次都会变，登陆后要保存起来。__

__注：cookies 中的 session_id 由两部分构成：user_id 和 session_key，这么设计是为了支持获取用户当前登陆的设备。__

__返回：__

```javascript
{
  "remember_token": "uxb4a782rg4cxq37mlt091i6",
  "session_key": "0dz2h6tr1vp0kphoipzb15e1olkqzmzn",
  "user_id": 2
}
```

## 用户登出

```javascript
GLOBAL API: DELETE /sessions/:session_id
```

## 获取用户服务

```javascript
GLOBAL API: GET /users/:user_id/services
```

```javascript
{
  "maxwell": {
    "endpoint": "tcp://182.92.98.136:2013",
    "password": "vG58jNk1PTPKA89vld3xmL68AA7mUJSpA1pwzztblLMq5GdMssTIj5LY9oK",
    "username": 2
  },
  "sip": {
    "password": "vG58jNk1PTPKA89vld3xmL68AA7mUJSpA1pwzztblLMq5GdMssTIj5LY9oK",
    "proxy_server": "123.57.59.182",
    "registrar": "123.57.59.182",
    "username": 2
  },
  "stun": {
    "server": "123.57.59.182"
  },
  "turn": {
    "password": "",
    "server": "123.57.59.182",
    "username": ""
  }
}
```

## 创建 Token

```javascript
GLOBAL API: POST /tokens
```

__参数：__

// 验证手机号合法性；

```javascript
{
  "phone": "12222222312",
  "type": 0
}
```

// 通过手机号重置密码；

```javascript
{
  "phone": "12312222222",
  "type": 1
}
```

__注：重置密码、验证手机号码合法性合法性依赖这个 API。__

## 搜索 Token

```javascript
GLOBAL API: GET /tokens?type=0&phone=:phone&value=:token // 验证手机号合法性
GLOBAL API: GET /tokens?type=1&phone=:phone&value=:token // 通过手机号重置密码
```

__如果能搜索到合法 token：__

```javascript
{
  "type": 1,
  "value": "9527"
}
```

__如果不能搜索到合法 token，则返回：__

```javascript
null
```

## 获取图片验证码

```javascript
GLOBAL API: GET /captcha?timestamp=:current_timestamp
```

__返回：__
图片验证码，有效期30分钟。

## 验证图片验证码

```javascript
GLOBAL API: GET /captcha_codes?code=:code
```

__返回：__

```javascript
{
  "code": "fyt7fy"
}
```

# 组织

## 新建组织

```javascript
GLOBAL API: POST /orgs
```

__参数：__

```javascript
{
  "category": "C1-C2-C3",
  "city": "Hangzhou",
  "domain": "ibm.starfish.im",
  "intro": "intro",
  "name": "ibm",
  "province": "Zhejiang"
}
```

__返回：__

```javascript
{
  "avatar_url": "http://some.url",
  "category": "C1-C2-C3",
  "city": "Hangzhou",
  "creator": {
    "avatar_url": "http://some.url",
    "id": 1,
    "name": "Steve"
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
  "avatar_url": "http://some.url",
  "category": "C1-C2-C3",
  "city": "Hangzhou",
  "creator": {
    "avatar_url": "http://some.url",
    "id": 1,
    "name": "Steve"
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
  "api_url": "http://some.url",
  "avatar_url": "http://some.url",
  "bfs_host": "bfs.starfish.im",
  "category": "C1-C2-C3",
  "city": "Hangzhou",
  "creator": {
    "avatar_url": "http://some.url",
    "id": 1,
    "name": "Steve"
  },
  "domain": "ibm.starfish.im",
  "id": 1,
  "intro": "",
  "name": "ibm",
  "province": "Zhejiang"
}
```

## 获取用户的组织信息

```javascript
GLOBAL API: GET /users/:user_id/orgs
```

__返回：__

```javascript
[
  {
    "api_url": "http://some.url",
    "avatar_url": "http://some.url",
    "bfs_host": "bfs.starfish.im",
    "category": "C1-C2-C3",
    "city": "Hangzhou",
    "creator": {
      "avatar_url": "http://some.url",
      "id": 1,
      "name": "Steve"
    },
    "domain": "ibm.starfish.im",
    "id": 1,
    "intro": "",
    "name": "ibm",
    "province": "Zhejiang"
  }
]
```

# 应用号

## 获取应用号列表

```javascript
ORG API: GET /orgs/:org_id/app_accounts
```

__返回：__

```javascript
[
  {
    "id": 1,
    "name": "会议助手",
    "avatar_url": "http://some.url",
    "type": 0
  }
]
```

## 获取指定应用号

```javascript
ORG API: GET /orgs/:org_id/app_accounts/:id
```

__返回：__

```javascript
{
  "id": 1,
  "name": "会议助手",
  "avatar_url": "http://some.url",
  "type": 0
}
```

# 组织成员

## 获取组织内成员列表

```javascript
ORG API: GET /orgs/:org_id/members
```

__返回：__

```javascript
[
  {
    "id": 1,
    "position": "engineer"
  }
]
```

## 获取成员信息

```javascript
ORG API: GET /orgs/:org_id/members/:member_id1[,:member_id2...]
```

__参数：__

```javascript
{
  "1": {
    "id": 2,
    "position": "engineer"
  },
  "2": {
    "id": 1,
    "position": "engineer"
  }
}
```

## 修改成员信息

```javascript
ORG API: PATCH /orgs/:org_id/members/:member_id
```

__参数：__

```javascript
{
  "position": "engineer"
}
```

## 将成员移出组织

```javascript
ORG API: DELETE /orgs/:org_id/members/:member_id1[,:member_id2,:member_id3,......]
```

# 讨论组

## 新建讨论组

```javascript
ORG API: POST /orgs/:org_id/discussion_groups
```

__参数：__

* name可选，不带name或name为空，讨论组将使用默认名字。

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
  "avatar_url": "http://some.url",
  "creator": {
    "avatar_url": "http://some.url",
    "id": 1,
    "name": "Steve"
  },
  "id": 29,
  "intro": "moto",
  "name": "hello"
}
```

## 更新讨论组信息

```javascript
ORG API: PATCH /orgs/:org_id/discussion_groups/:group_id
```

__参数：__

```javascript
{
  "intro": "hello moto",
  "name": "rd123"
}
```

__返回：__

```javascript
[
  {
    "avatar_url": "http://some.url",
    "creator": {
      "avatar_url": "http://some.url",
      "id": 1,
      "name": "Steve"
    },
    "id": 1,
    "intro": "",
    "name": ""
  }
]
```

__注：该 API 可以更新讨论组头像，字段名：avatar，头像文件以附件形式上传，此时请求编码格式为：multipart/form-data。__

## 解散讨论组

```javascript
ORG API: DELETE /orgs/:org_id/discussion_groups/:group_id
```

## 获取讨论组详情

```javascript
ORG API: GET /orgs/:org_id/discussion_groups/:group_id
```

__返回：__

```javascript
{
  "avatar_url": "http://some.url",
  "creator": {
    "avatar_url": "http://some.url",
    "id": 1,
    "name": "Steve"
  },
  "id": 1,
  "intro": "",
  "name": "rd"
}
```

## 获取指定组织成员的讨论组

```javascript
ORG API: GET /orgs/:org_id/members/:member_id/discussion_groups
```

__返回：__

```javascript
[
  {
    "avatar_url": "http://some.url",
    "creator": {
      "avatar_url": "http://some.url",
      "id": 1,
      "name": "Steve"
    },
    "id": 3,
    "intro": "",
    "name": "group name"
  }
]
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
  "avatar_url": "http://some.url",
  "creator": {
    "avatar_url": "http://some.url",
    "id": 1,
    "name": "Steve"
  },
  "id": 2,
  "name": "rd",
  "parent": 1
}
```

## 更新部门

```javascript
ORG API: PATCH /orgs/:org_id/departments/:id
```

__参数：__

```javascript
{
  "name": "rd"
}
```

__返回：__

```javascript
{
  "avatar_url": "http://some.url",
  "creator": {
    "avatar_url": "http://some.url",
    "id": 1,
    "name": "Steve"
  },
  "id": 2,
  "name": "rd",
  "parent": 1
}
```

## 删除部门

```javascript
ORG API: DELETE /orgs/:org_id/departments/:id
```

## 获取部门列表

```javascript
ORG API: GET /orgs/:org_id/departments?parent=:parent
```

__返回：__

```javascript
[
  {
    "avatar_url": "http://some.url",
    "creator": {
      "avatar_url": "http://some.url",
      "id": 1,
      "name": "Steve"
    },
    "id": 55,
    "name": "department name",
    "parent": 1
  }
]
```

## 获取部门详情

```javascript
ORG API: GET /orgs/:org_id/departments/:id
```

__返回：__

```javascript
{
  "avatar_url": "http://some.url",
  "creator": {
    "avatar_url": "http://some.url",
    "id": 1,
    "name": "Steve"
  },
  "id": 55,
  "name": "department name",
  "parent": 1
}
```

## 添加部门成员

```javascript
ORG API: POST /orgs/:org_id/departments/:id/members
```

__参数：__

```javascript
[
  1,
  2
]
```

## 获取部门成员

```javascript
ORG API: GET /orgs/:org_id/departments/:id1[,id2,id3,...]/members?is_direct=1
```

__参数：__

* is_direct=1, 只返回直属于该部门的成员，否则该部门的(多层)子部门成员也返回，默认为1。

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

## 删除部门成员

```javascript
ORG API: DELETE /orgs/:org_id/departments/:id/members/:member_id1[,:member_id2,:member_id3...]
```

## 修改用户部门

```javascript
ORG API: PATCH /orgs/:org_id/members/:member_id/departments
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
ORG API: GET /orgs/:org_id/members/:member_id/departments?is_direct=1
```
__参数：__

* is_direct=1，只返回成员的直属部门，否则返回所有（直属+非直属）部门，is_direct默认为0。

__返回：__

```javascript
[
  {
    "avatar_url": "http://some.url",
    "id": 1,
    "name": "cloud"
  },
  {
    "avatar_url": "http://some.url",
    "id": 2,
    "name": "product"
  }
]
```

# 邀请

## 邀请状态定义

```javascript
INIT = 0
IGNORE = 1
REFUSE = 2
CONFIRM = 3
```

## 邀请用户加入组织

```javascript
GLOBAL API: POST /invitations
```

__参数：__

// 邀请 Starfish 注册用户

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

__返回：__

```javascript
{
  "created_at": 1397201477,
  "id": 476,
  "org": {
    "api_url": "http://some.url",
    "avatar_url": "http://some.url",
    "bfs_host": "bfs.starfish.im",
    "category": "C1-C2-C3",
    "city": "Hangzhou",
    "creator": {
      "avatar_url": "http://some.url",
      "id": 1,
      "name": "Steve"
    },
    "domain": "ibm.starfish.im",
    "id": 1,
    "intro": "",
    "name": "ibm",
    "province": "Zhejiang"
  },
  "org_id": 1,
  "status": 0,
  "updated_at": 1395714700,
  "who": {
    "avatar_url": "http://some.url",
    "gender": 0,
    "id": 4,
    "intro": "",
    "name": "zenglu",
    "phone": "9527"
  },
  "whom": {
    "avatar_url": "http://some.url",
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
GLOBAL API: PATCH /invitations/:invitation_id
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
  "created_at": 1397201477,
  "id": 476,
  "org": {
    "api_url": "http://some.url",
    "avatar_url": "http://some.url",
    "bfs_host": "bfs.starfish.im",
    "category": "C1-C2-C3",
    "city": "Hangzhou",
    "creator": {
      "avatar_url": "http://some.url",
      "id": 1,
      "name": "Steve"
    },
    "domain": "ibm.starfish.im",
    "id": 1,
    "intro": "",
    "name": "ibm",
    "province": "Zhejiang"
  },
  "org_id": 1,
  "status": 1,
  "updated_at": 1395714700,
  "who": {
    "avatar_url": "http://some.url",
    "gender": 0,
    "id": 4,
    "intro": "",
    "name": "liuzenglu",
    "phone": "9527"
  },
  "whom": {
    "avatar_url": "http://some.url",
    "gender": 0,
    "id": 15,
    "intro": "",
    "name": "changhua",
    "phone": "9528"
  }
}
```

# 会话&消息

## 常量定义

### MessageType 定义

```javascript
INVITATION_CREATED = 0
INVITATION_UPDATED = 1

TEXT_CHAT_CREATED = 2
FILE_CHAT_CREATED = 3

CONVERSATION_CREATED = 9
CONVERSATION_UPDATED = 18
CONVERSATION_DELETED = 21
CONVERSATION_MESSAGES_DELETED = 57
CONVERSATION_MESSAGES_READ = 62
MESSAGES_UPDATED = 64
MESSAGE_UPDATED = 65

ORG_CREATED = 10
ORG_UPDATED = 11
ORG_MEMBER_JOINED = 14
ORG_MEMBER_LEFT = 15
ORG_MEMBER_UPDATED = 51

DISCUSSION_GROUP_CREATED = 12
DISCUSSION_GROUP_UPDATED = 13
DISCUSSION_GROUP_DISBANDED = 20
DISCUSSION_GROUP_MEMBER_JOINED = 16
DISCUSSION_GROUP_MEMBER_LEFT = 17

DEPARTMENT_CREATED = 40
DEPARTMENT_UPDATED = 41
DEPARTMENT_DISBANDED = 42
DEPARTMENT_CREATED_V2 = 205

DEPARTMENT_MEMBER_JOINED = 43
DEPARTMENT_MEMBER_LEFT = 44
MEMBER_DEPARTMENTS_UPDATED = 55
MEMBER_DEPARTMENTS_UPDATED_V2 = 100

AGENT_GOT_ONLINE = 45
AGENT_GOT_OFFLINE = 46

USER_UPDATED = 8
USER_UPDATED_V2 = 206
USER_PASSWORD_CHANGED = 49
USER_GOT_OFFLINE = 50

ORG_APP_INSTALLED = 58
ORG_APP_UNINSTALLED = 59

ORG_ADMIN_CREATED = 66
ORG_ADMIN_DELETED = 67

ORG_MEMBER_NAVIGATION_APP_INSTALLED = 60
ORG_MEMBER_NAVIGATION_APP_UNINSTALLED = 61

DRI_COMPONENT_UPDATED = 56

APP_CONTENT_UPDATED = 63

ORG_MEMBER_JOINED_V2 = 202
ORG_MEMBER_LEFT_V2 = 203
ORG_MEMBER_UPDATED_V2 = 204

APP_ACCOUNT_JOINED = 201
```

### SrcType 定义

* SYSTEM = 0
* ORG_MEMBER = 1
* EXTERNAL_CONTACT = 2
* GENERATED_CONTACT = 4
* APP_ACCOUNT = 5

### DestType 定义

* ORG_MEMBER = 0
* DISCUSSION_GROUP = 1
* DEPARTMENT = 3
* ORG = 2

### PeerType 定义

* ORG_MEMBER = 0
* DISCUSSION_GROUP = 1
* EXTERNAL_CONTACT = 2
* DEPARTMENT = 3
* GENERATED_CONTACT = 4
* APP_ACCOUNT = 5

## Maxwell 推送示例

### 结构说明

推送内容的结构是：

```javascript
{
  "body": {},
  "created_at": 1395714696,
  "dest": {
    "avatar_url": "http://some.url",
    "id": 1,
    "name": "Target"
  },
  "dest_type": 1,
  "id": 1,
  "scope_org_id": 0,
  "src": {
    "avatar_url": "http://some.url",
    "id": 3,
    "name": "From"
  },
  "src_type": 1,
  "type": 1
}
```

以下示例省略这些公共字段，只给出 body 内容。

### INVITATION_CREATED = 0

```javascript
{
  "invitation": {
    "created_at": 1395714700,
    "id": 1,
    "org": {
      "api_url": "http://some.url",
      "avatar_url": "http://some.url",
      "bfs_host": "bfs.starfish.im",
      "category": "C1-C2-C3",
      "city": "Hangzhou",
      "creator": {
        "avatar_url": "http://some.url",
        "id": 1,
        "name": "Steve"
      },
      "domain": "ibm.starfish.im",
      "id": 1,
      "intro": "",
      "name": "ibm",
      "province": "Zhejiang"
    },
    "status": 0,
    "updated_at": 1395714700,
    "who": {
      "avatar_url": "http://some.url",
      "gender": 1,
      "id": 1,
      "intro": "",
      "name": "alice",
      "phone": "123"
    },
    "whom": {
      "avatar_url": "http://some.url",
      "gender": 1,
      "id": 5,
      "intro": "",
      "name": "kate",
      "phone": "126"
    }
  }
}
```

### INVITATION_UPDATED = 1

```javascript
{
  "invitation": {
    "created_at": 1395714700,
    "id": 1,
    "org": {
      "api_url": "http://some.url",
      "avatar_url": "http://some.url",
      "bfs_host": "bfs.starfish.im",
      "category": "C1-C2-C3",
      "city": "Hangzhou",
      "creator": {
        "avatar_url": "http://some.url",
        "id": 1,
        "name": "Steve"
      },
      "domain": "ibm.starfish.im",
      "id": 1,
      "intro": "",
      "name": "ibm",
      "province": "Zhejiang"
    },
    "status": 1,
    "updated_at": 1395714700,
    "who": {
      "avatar_url": "http://some.url",
      "gender": 1,
      "id": 1,
      "intro": "",
      "name": "alice",
      "phone": "123"
    },
    "whom": {
      "avatar_url": "http://some.url",
      "gender": 1,
      "id": 5,
      "intro": "",
      "name": "kate",
      "phone": "126"
    }
  }
}
```

### TEXT_CHAT_CREATED = 2

```javascript
{
  "chat": {
    "content": "hello moto",
    "created_at": 1395714696,
    "dest": {
      "avatar_url": "http://some.url",
      "id": 2,
      "name": "Target"
    },
    "dest_type": 0,
    "id": 1,
    "src": {
      "avatar_url": "http://some.url",
      "id": 3,
      "name": "From"
    },
    "src_type": 1
  }
}
```

### FILE_CHAT_CREATED = 3

// 录音，length 是音频时长

```javascript
{
  "chat": {
    "created_at": 1395714696,
    "dest": {
      "avatar_url": "http://some.url",
      "id": 2,
      "name": "Target"
    },
    "dest_type": 0,
    "filename": "1/2014-03-25/65/f",
    "id": 1,
    "length": 3,
    "mimetype": "audio/mp4",
    "name": "hello.starfish-m4a",
    "src": {
      "avatar_url": "http://some.url",
      "id": 3,
      "name": "From"
    },
    "src_type": 1,
    "url": "http://some.url"
  }
}
```

// 截图

```javascript
{
  "chat": {
    "created_at": 1395714696,
    "dest": {
      "avatar_url": "http://some.url",
      "id": 2,
      "name": "Target"
    },
    "dest_type": 0,
    "filename": "1/2014-03-25/65/f",
    "id": 1,
    "mimetype": "image/jpeg",
    "name": "hello.starfish-png",
    "size": 1801842,
    "src": {
      "avatar_url": "http://some.url",
      "id": 3,
      "name": "From"
    },
    "src_type": 1,
    "thumbs": {
      "mobile": {
        "height": 768,
        "width": 1024
      }
    },
    "url": "http://some.url"
  }
}
```

// mp3 文件

```javascript
{
  "chat": {
    "created_at": 1422328269,
    "dest": {
      "avatar_url": "http://some.url",
      "id": 2,
      "name": "Target"
    },
    "dest_type": 0,
    "filepath": "1/2015-01-27/78730028/f.mp3",
    "id": 1,
    "mimetype": "audio/mpeg",
    "name": "hello.mp3",
    "size": 3836351,
    "src": {
      "avatar_url": "http://some.url",
      "id": 3,
      "name": "From"
    },
    "src_type": 1,
    "url": "http://some.url"
  }
}
```

// pdf 文件

```javascript
{
  "chat": {
    "created_at": 1422328607,
    "dest": {
      "avatar_url": "http://some.url",
      "id": 2,
      "name": "Target"
    },
    "dest_type": 0,
    "filepath": "1/2015-01-27/32358657/f.pdf",
    "id": 1,
    "mimetype": "application/pdf",
    "name": "exim-filter.pdf",
    "size": 101338,
    "src": {
      "avatar_url": "http://some.url",
      "id": 3,
      "name": "From"
    },
    "src_type": 1,
    "url": "http://some.url"
  }
}
```

### RICH_TEXT_CHAT_CREATED = 4

```javascript
{
  "chat": {
    "id": 4308853469752136758, 
    "created_at": 1460358160, 
    "content": {
      "title":"老大给你安排了一个xxx考试",
      "examStartTime":"2016-01-01 12-01-02",
      "exameTime":"2小时",
      "url":"http://some.url"
    },  
    "apns_summary":"老大给你安排了一个xxx考试", 
    "type": 0, 
    "dest_id": 2,        
    "dest_type": 0, 
    "dest": {
      "name": "Target", 
      "id": 2, 
      "avatar_url": "http://some.url"
    },
    "src_id": 3778, 
    "src_type": 5,
    "src": {
      "name": "From",
      "id": 3778,
      "avatar_url": "http://some.url"
    }
  }
}
```

### CONVERSATION_CREATED = 9

```javascript
{
  "conversation": {
    "id": 4349,
    "is_hidden": 0,
    "last_old_message_id": 7,
    "peer": {
      "avatar_url": "http://some.url",
      "id": 651,
      "name": "From"
    },
    "peer_type": 1,
    "updated_at": 1395640459,
    "user_id": 2
  }
}
```

### CONVERSATION_UPDATED = 18

```javascript
{
  "conversation": {
    "id": 4349,
    "is_hidden": 0,
    "last_old_message_id": 7,
    "peer": {
      "avatar_url": "http://some.url",
      "id": 651,
      "name": "To"
    },
    "peer_type": 1,
    "updated_at": 1395640459,
    "user_id": 2
  }
}
```

### CONVERSATION_DELETED = 21

```javascript
{
  "conversation": {
    "id": 1,
    "is_hidden": 0,
    "last_old_message_id": 7,
    "peer": {
      "avatar_url": "http://some.url",
      "id": 651,
      "name": "To"
    },
    "peer_type": 0,
    "updated_at": 1395640459,
    "user_id": 1
  }
}
```

### CONVERSATION_MESSAGES_DELETED = 57

```javascript
{
  "conversation": {
    "id": 1,
    "is_hidden": 0,
    "last_old_message_id": 7,
    "peer": {
      "avatar_url": "http://some.url",
      "id": 651,
      "name": "To"
    },
    "peer_type": 0,
    "updated_at": 1395640459,
    "user_id": 1
  }
}
```

### CONVERSATION_MESSAGES_READ = 62

```javascript
{
  "messages": [
    1,
    2,
    5
  ],
  "reader": 6
}
```

### MESSAGES_UPDATED = 64

```javascript
{
  "last_old": 4735282044683635
}
```

### MESSAGE_UPDATED = 65

```javascript
{
  "is_deleted": 1, //表示消息被撤销
}
```

### ORG_CREATED = 10

```javascript
{
  "org": {
    "api_url": "http://some.url",
    "avatar_url": "http://some.url",
    "bfs_host": "bfs.starfish.im",
    "category": "C1-C2-C3",
    "city": "Hangzhou",
    "creator": {
      "avatar_url": "http://some.url",
      "id": 1,
      "name": "Steve"
    },
    "domain": "ibm.starfish.im",
    "id": 1,
    "intro": "",
    "name": "ibm",
    "province": "Zhejiang"
  }
}
```

### ORG_UPDATED = 11

```javascript
{
  "org": {
    "api_url": "http://some.url",
    "avatar_url": "http://some.url",
    "bfs_host": "bfs.starfish.im",
    "category": "C1-C2-C3",
    "city": "Hangzhou",
    "creator": {
      "avatar_url": "http://some.url",
      "id": 1,
      "name": "Steve"
    },
    "domain": "ibm.starfish.im",
    "id": 1,
    "intro": "",
    "name": "ibm",
    "province": "Zhejiang"
  }
}
```

### ORG_MEMBER_JOINED = 14

```javascript
{
  "org": {
    "api_url": "http://some.url",
    "avatar_url": "http://some.url",
    "bfs_host": "bfs.starfish.im",
    "category": "C1-C2-C3",
    "city": "Hangzhou",
    "creator": {
      "avatar_url": "http://some.url",
      "id": 1,
      "name": "Steve"
    },
    "domain": "ibm.starfish.im",
    "id": 1,
    "intro": "",
    "name": "ibm",
    "province": "Zhejiang"
  },
  "user": {
    "avatar_url": "http://some.url",
    "gender": 1,
    "id": 1,
    "intro": "",
    "name": "alice",
    "phone": "123"
  }
}
```

### ORG_MEMBER_LEFT = 15

```javascript
{
  "org": {
    "api_url": "http://some.url",
    "avatar_url": "http://some.url",
    "bfs_host": "bfs.starfish.im",
    "category": "C1-C2-C3",
    "city": "Hangzhou",
    "creator": {
      "avatar_url": "http://some.url",
      "id": 1,
      "name": "Steve"
    },
    "domain": "ibm.starfish.im",
    "id": 1,
    "intro": "",
    "name": "ibm",
    "province": "Zhejiang"
  },
  "user": {
    "avatar_url": "http://some.url",
    "gender": 1,
    "id": 1,
    "intro": "",
    "name": "alice",
    "phone": "123"
  }
}
```

### ORG_MEMBER_UPDATED = 51

```javascript
{
  "member": {
    "id": 133,
    "position": ""
  },
  "org_id": 1
}
```

### DISCUSSION_GROUP_CREATED = 12

```javascript
{
  "group": {
    "avatar_url": "http://some.url",
    "creator": {
      "avatar_url": "http://some.url",
      "id": 1,
      "name": "Steve"
    },
    "id": 1,
    "intro": "",
    "name": "rd"
  }
}
```

### DISCUSSION_GROUP_UPDATED = 13

```javascript
{
  "group": {
    "avatar_url": "http://some.url",
    "creator": {
      "avatar_url": "http://some.url",
      "id": 1,
      "name": "Steve"
    },
    "id": 1,
    "intro": "foobar",
    "name": "hello.moto"
  }
}
```

### DISCUSSION_GROUP_DISBANDED = 20

```javascript
{
  "group": {
    "avatar_url": "http://some.url",
    "creator": {
      "avatar_url": "http://some.url",
      "id": 1,
      "name": "Steve"
    },
    "id": 1,
    "intro": "foobar",
    "name": "hello.moto"
  }
}
```

### DISCUSSION_GROUP_MEMBER_JOINED = 16

```javascript
{
  "group": {
    "avatar_url": "http://some.url",
    "creator": {
      "avatar_url": "http://some.url",
      "id": 1,
      "name": "Steve"
    },
    "id": 1,
    "intro": "",
    "name": "rd"
  },
  "operator": {
    "avatar_url": "http://some.url",
    "id": 1,
    "name": "alice"
  },
  "users": [
    1,
    2,
    4
  ]
}
```

### DISCUSSION_GROUP_MEMBER_LEFT = 17

```javascript
{
  "group": {
    "avatar_url": "http://some.url",
    "creator": {
      "avatar_url": "http://some.url",
      "id": 1,
      "name": "Steve"
    },
    "id": 1,
    "intro": "",
    "name": "rd"
  },
  "operator": {
    "avatar_url": "http://some.url",
    "id": 1,
    "name": "alice"
  },
  "users": [
    1,
    3
  ]
}
```

### DEPARTMENT_CREATED = 40

```javascript
{
  "department": {
    "avatar_url": "http://some.url",
    "creator": {
      "avatar_url": "http://some.url",
      "id": 1,
      "name": "Steve"
    },
    "id": 1,
    "name": "rd",
    "parent": 1
  }
}
```

### DEPARTMENT_UPDATED = 41

```javascript
{
  "department": {
    "avatar_url": "http://some.url",
    "creator": {
      "avatar_url": "http://some.url",
      "id": 1,
      "name": "Steve"
    },
    "id": 1,
    "name": "hello.moto",
    "parent": 1
  }
}
```

### DEPARTMENT_DISBANDED = 42

```javascript
{
  "department": {
    "avatar_url": "http://some.url",
    "creator": {
      "avatar_url": "http://some.url",
      "id": 1,
      "name": "Steve"
    },
    "id": 1,
    "name": "rd",
    "parent": 1
  }
}
```

### DEPARTMENT_CREATED_V2 = 205

```javascript
[
    {
      "department": {
        "avatar_url": "http://some.url",
        "creator": {
          "avatar_url": "http://some.url",
          "id": 1,
          "name": "Steve"
        },
        "id": 1,
        "name": "rd",
        "parent": 1
      }
    }
]
```

### DEPARTMENT_MEMBER_JOINED = 43

```javascript
{
  "department": {
    "avatar_url": "http://some.url",
    "creator": {
      "avatar_url": "http://some.url",
      "id": 1,
      "name": "Steve"
    },
    "id": 1,
    "name": "rd",
    "parent": 1
  },
  "operator": {
    "avatar_url": "http://some.url",
    "id": 1,
    "name": "alice"
  },
  "users": [
    1,
    3
  ]
}
```

### DEPARTMENT_MEMBER_LEFT = 44

```javascript
{
  "department": {
    "avatar_url": "http://some.url",
    "creator": {
      "avatar_url": "http://some.url",
      "id": 1,
      "name": "Steve"
    },
    "id": 1,
    "name": "rd"
  },
  "operator": {
    "avatar_url": "http://some.url",
    "id": 1,
    "name": "alice"
  },
  "users": [
    1,
    3
  ]
}
```

### MEMBER_DEPARTMENTS_UPDATED = 55

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

### MEMBER_DEPARTMENTS_UPDATED_V2 = 100

```javascript
{
  "1": {
    "is_direct": [
      4,
      5
    ],
    "is_not_direct": [
      1,
      2,
      3
    ],
    "original_is_direct": [
      6,
      7
    ],
    "original_is_not_direct": [
      8,
      9
    ]
  }
}
```

### AGENT_GOT_ONLINE = 45

```javascript
{
  "agent": {
    "desc": "alice iphone",
    "key": "c7b4b54f8dac7cf66e732924964a53f2",
    "type": 10
  },
  "user_id": 3
}
```

### AGENT_GOT_OFFLINE = 46

```javascript
{
  "agent": {
    "desc": "alice iphone",
    "key": "c7b4b54f8dac7cf66e732924964a53f2",
    "type": 10
  },
  "user_id": 3
}
```

### USER_UPDATED = 8

```javascript
{
  "user": {
    "avatar_url": "http://some.url",
    "gender": 1,
    "id": 1,
    "intro": "",
    "name": "alice",
    "phone": "123"
  }
}
```

### USER_UPDATED_V2 = 206

```javascript
[
  {
    "user": {
      "avatar_url": "http://some.url",
      "gender": 1,
      "id": 1,
      "intro": "",
      "name": "alice",
      "phone": "123"
    }
  }
]
```

### USER_PASSWORD_CHANGED = 49

```javascript
{
  "user": 3
}
```

### USER_GOT_OFFLINE = 50

```javascript
{
  "agent": {
    "desc": "alice iphone",
    "key": "c7b4b54f8dac7cf66e732924964a53f2",
    "type": 10
  },
  "message": "You have been forced offline."
}
```

### ORG_APP_INSTALLED = 58

```javascript
{
  "app": 1
}
```

### ORG_APP_UNINSTALLED = 59

```javascript
{
  "app": 1
}
```

### ORG_ADMIN_CREATED = 66

```javascript
{
  "operator": {
    "avatar_url": "http://some.url",
    "id": 1,
    "name": "alice"
  }
}
```

### ORG_ADMIN_DELETED = 67

```javascript
{
  "operator": {
    "avatar_url": "http://some.url",
    "id": 1,
    "name": "alice"
  }
}
```

### ORG_MEMBER_NAVIGATION_APP_INSTALLED = 60

```javascript
{
  "app": 1
}
```

### ORG_MEMBER_NAVIGATION_APP_UNINSTALLED = 61

```javascript
{
  "app": 1
}
```

### DRI_COMPONENT_UPDATED = 56

```javascript
{
  "caller": 120,
  "conference_id": "c1453192441414733",
  "event_content": 188,
  "event_occurred_at": 1453184785,
  "event_type": "REJECT",
  "parties": [
    139,
    188
  ]
}
```

### APP_CONTENT_UPDATED = 63

```javascript
{
  "app": {
    "id": 1,
    "name": "Project"
  },
  "content": {
    "icon": "http://some.url",
    "subject": "[OPEN] some task",
    "url": "http://some.url"
  }
}
```

### ORG_MEMBER_JOINED_V2 = 202

```javascript
{
  "org": {
    "api_url": "http://some.url",
    "avatar_url": "http://some.url",
    "bfs_host": "bfs.starfish.im",
    "category": "C1-C2-C3",
    "city": "Hangzhou",
    "creator": {
      "avatar_url": "http://some.url",
      "id": 1,
      "name": "Steve"
    },
    "domain": "ibm.starfish.im",
    "id": 1,
    "intro": "",
    "name": "ibm",
    "province": "Zhejiang"
  },
  "users": [
      {
        "avatar_url": "http://some.url",
        "gender": 1,
        "id": 1,
        "intro": "",
        "name": "alice",
        "phone": "123"
      }
  ]
}
```

### ORG_MEMBER_LEFT_V2 = 203

```javascript
{
  "org": {
    "api_url": "http://some.url",
    "avatar_url": "http://some.url",
    "bfs_host": "bfs.starfish.im",
    "category": "C1-C2-C3",
    "city": "Hangzhou",
    "creator": {
      "avatar_url": "http://some.url",
      "id": 1,
      "name": "Steve"
    },
    "domain": "ibm.starfish.im",
    "id": 1,
    "intro": "",
    "name": "ibm",
    "province": "Zhejiang"
  },
  "users": [
      {
          "avatar_url": "http://some.url",
          "gender": 1,
          "id": 1,
          "intro": "",
          "name": "alice",
          "phone": "123"
      }
  ]
}
```

### ORG_MEMBER_UPDATED_V2 = 204

```javascript
{
  "members": [
      {
        "id": 133,
        "position": ""
      }
  ],
  "org_id": 1
}
```

### APP_ACCOUNT_JOINED = 201

```javascript
{
  "app_account": {
    "avatar_url": "http://some.url",
    "id": 1,
    "name": "考试助手"
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
  "is_hidden": 0,
  "last_old_message_id": 109,
  "peer": {
    "avatar_url": "http://some.url",
    "id": 1,
    "name": "Alice"
  },
  "peer_type": 1,
  "updated_at": 1395640459,
  "user_id": 6
}
```

## 获取指定组织成员的 conversation 列表

```javascript
ORG API: GET /orgs/:org_id/members/:member_id/conversations
```

__返回：__

```javascript
[
  {
    "id": 4,
    "is_hidden": 0,
    "last_old_message_id": 109,
    "peer": {
      "avatar_url": "http://some.url",
      "id": 1,
      "name": "Alice"
    },
    "peer_type": 1,
    "updated_at": 1395640459,
    "user_id": 6
  }
]
```

## 删除 conversation

```javascript
ORG API: DELETE /orgs/:org_id/members/:member_id/conversations/:conversation_id
```

## 更新 conversation

```javascript
ORG API: PATCH /orgs/:org_id/members/:member_id/conversations/:conversation_id
```

__参数：__

* 标为隐藏is_hidden=1，取消隐藏is_hidden=0

```javascript
{
  "is_hidden": 1,
  "last_old_message_id": 15
}
```

## 删除 conversation 所有消息

```javascript
ORG API: DELETE /orgs/:org_id/members/:member_id/conversations/:conversation_id/messages
```

## 获取指定 conversation 的消息列表

```javascript
ORG API: GET /orgs/:org_id/members/:member_id/conversations/:conversation_id/messages?start=:id&ps=30
```

__参数：__

* 返回 ps 条消息，默认30，返回列表倒序排列（最新的排在前面）。
* 当指定start，获取比 start 更早的ps条消息。
* 当指定end，获取比end更晚的ps条消息。
* 当指定middle，获取包含middle在内的前后各ps/2条消息。
* 不指定 start，end和middle，获取最新的消息列表。

__返回：__

```javascript
[
  {
    "body": {
      "chat": {
        "content": "hello",
        "created_at": 1423628172,
        "dest": {
          "avatar_url": "http://some.url",
          "id": 651,
          "name": "Target"
        },
        "dest_type": 1,
        "id": 170186,
        "src": {
          "avatar_url": "http://some.url",
          "id": 4,
          "name": "Patrick"
        },
        "src_type": 1
      }
    },
    "created_at": 1423628172,
    "dest": {
      "avatar_url": "http://some.url",
      "id": 651,
      "name": "Target"
    },
    "dest_type": 1,
    "id": 4000739999318717000,
    "scope_org_id": 1,
    "src": {
      "avatar_url": "http://some.url",
      "id": 4,
      "name": "Patrick"
    },
    "src_type": 1,
    "type": 2
  }
]
```

## 将组织内消息撤销

```javascript
ORG API: PATCH /orgs/:org_id/members/:member_id/messages/:message_id
```

__参数：__

```javascript
{
  "is_deleted": 1
}
```

## 将组织内消息标记为已读

```javascript
ORG API: PATCH /orgs/:org_id/messages
```

__参数：__

```javascript
{
  "is_read": 1,
  "messages": [
    {
      "id": 12,
      "src_id": 3,
      "src_type": 1
    }
  ]
}
```

## 获取用户的全局消息列表

```javascript
GLOBAL API: GET /users/:user_id/messages?start=:start
```

__参数：__

* 获取比 start 更早的消息列表，倒序排列（最新的排在前面），不指定 start 获取最新的消息列表，返回 30 条消息。

__返回：__

```javascript
[
  {
    "body": {
      "invitation": {
        "created_at": 1395714700,
        "id": 1,
        "org": {
          "api_url": "http://some.url",
          "avatar_url": "http://some.url",
          "bfs_host": "bfs.starfish.im",
          "category": "C1-C2-C3",
          "city": "Hangzhou",
          "creator": {
            "avatar_url": "http://some.url",
            "id": 1,
            "name": "Steve"
          },
          "domain": "ibm.starfish.im",
          "id": 1,
          "intro": "",
          "name": "ibm",
          "province": "Zhejiang"
        },
        "status": 0,
        "updated_at": 1395714700,
        "who": {
          "avatar_url": "http://some.url",
          "gender": 1,
          "id": 1,
          "intro": "",
          "name": "alice",
          "phone": "123"
        },
        "whom": {
          "avatar_url": "http://some.url",
          "gender": 1,
          "id": 5,
          "intro": "",
          "name": "kate",
          "phone": "126"
        }
      }
    },
    "created_at": 1423628172,
    "dest": {
      "avatar_url": "http://some.url",
      "id": 2,
      "name": "Target"
    },
    "dest_type": 1,
    "id": 4000739999318717000,
    "scope_org_id": 1,
    "src": {
      "avatar_url": "http://some.url",
      "id": 3,
      "name": "From"
    },
    "src_type": 1,
    "type": 2
  }
]
```

## 获取用户全局消息最后已读

```javascript
GLOBAL API: GET /users/:user_id/messages/last_old
```

__返回：__

```javascript
4735282044683635
```

## 更新用户全局消息最后已读

```javascript
GLOBAL API: PATCH /users/:user_id/messages/last_old
```

__参数：__

```javascript
4735282044683635
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
      "created_at": 1424050988,
      "dest": {
        "avatar_url": "http://some.url",
        "id": 2,
        "name": "Target"
      },
      "dest_type": 0,
      "id": 177040,
      "src": {
        "avatar_url": "http://some.url",
        "id": 3,
        "name": "From"
      },
      "src_type": 1
    }
  },
  "created_at": 1424050988,
  "dest": {
    "avatar_url": "http://some.url",
    "id": 2,
    "name": "Target"
  },
  "dest_type": 0,
  "id": 4004286829822905300,
  "scope_org_id": 1,
  "src": {
    "avatar_url": "http://some.url",
    "id": 3,
    "name": "From"
  },
  "src_type": 1,
  "type": 2
}
```

// 注意：多媒体聊天和文本聊天类似，内部格式请参照 FILE_CHAT_CREATED

## 转发消息

```javascript
ORG API: POST /orgs/:org_id/messages
```

type 可选：TEXT_CHAT_CREATED/FILE_CHAT_CREATED/APP_CONTENT_UPDATED

__参数：__

```javascript
{
  "body": {
    "id": 2
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

## 获取聊天中的附件

```javascript
ORG API: GET /orgs/:org_id/chats/:chat_id/attachment
```

__返回：对于图片，加上参数：width=:width, height=:height 可以获得缩略图__

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

__platform 常量定义__

```javascript
WINDOWS = 0
LINUX = 1
MAC = 2
ANDROID = 3
IOS = 4
```

__code 常量定义__

官方版本：starfish，云学堂版本：yxt

```javascript
GLOBAL API: GET /versions/latest?platform=:platform&code=:code&debug=0
```

__返回：__

```javascript
{
  "id": 1,
  "package_url": "http://some.url",
  "platform": 4,
  "release_notes": "some features...",
  "version": "1.1.2"
}
```

## 错误编码、错误消息

```javascript
GLOBAL API: GET /i18n/properties
```

__返回：__

```javascript
{
  "0": "OK",
  "1": "duplicate phone number",
  "2": "bad username or password"
}
```

## 更新 app badge

```javascript
GLOBAL API: PATCH /users/:user_id/devices/:device_token/badge
```

__参数：__

```javascript
16
```

# 全局搜索

__搜索类型定义__

* MESSAGE = 1
* CONTACT = 100
* ORG_MEMBER = 101
* DISCUSS_GROUP = 102
* DEPARTMENT = 103

## 搜索

```javascript
ORG API: GET /orgs/:org_id/search?q=hello&type=1&page=1&count=5&highlight=1
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
        "created_at": "2015-04-20 18:26:44",
        "id": 4050211238809908700,
        "peer": {
          "avatar_url": "http://some.url",
          "id": 5,
          "name": "To"
        },
        "peer_type": 1,
        "src": {
          "avatar_url": "http://some.url",
          "id": 3,
          "name": "From"
        },
        "src_type": 1,
        "type": 2
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
        "avatar_url": "http://some.url",
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
        "avatar_url": "http://some.url",
        "id": 9,
        "name": "Michael Jackson"
      },
      "type": 101
    }
  ],
  "total": 2
}
```
## 搜索消息

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
      "created_at": "2015-04-20 18:26:44",
      "id": 4050211238809908700,
      "peer": {
        "avatar_url": "http://some.url",
        "id": 5,
        "name": "To"
      },
      "peer_type": 1,
      "src": {
        "avatar_url": "http://some.url",
        "id": 3,
        "name": "From"
      },
      "src_type": 1,
      "type": 2
    },
    {
      "conversation_id": 4992,
      "count": 30,
      "peer": {
        "avatar_url": "http://some.url",
        "id": 7,
        "name": "To"
      },
      "peer_type": 1
    }
  ],
  "total": 31
}
```

# 应用中心

__应用定义__

* 项目系统 PROJECT = 1
* 文件系统 FILE = 2
* 邮件系统 MAIL = 3

## 安装应用

```javascript
ORG API: POST /orgs/:org_id/dashboard/apps
```

__参数：__

```javascript
{
  "app": 2
}
```

## 卸载应用

```javascript
ORG API: DELETE /orgs/:org_id/dashboard/apps/:app
```

## 已安装应用列表

```javascript
ORG API: GET /orgs/:org_id/dashboard/apps
```

__返回：__
```javascript
[
  {
    "app": 2,
    "creator": {
      "avatar_url": "http://some.url",
      "id": 1,
      "name": "Steve"
    }
  }
]
```

## 添加应用导航

```javascript
ORG API: POST /orgs/:org_id/members/:member_id/navigation/apps
```

__参数：__

```javascript
{
  "app": 2
}
```

## 删除应用导航

```javascript
ORG API: DELETE /orgs/:org_id/members/:member_id/navigation/apps/:app
```

## 导航应用列表

```javascript
ORG API: GET /orgs/:org_id/members/:member_id/navigation/apps
```

__返回：__
```javascript
[
  2,
  1,
  3
]
```
