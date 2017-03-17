# 数据变更推送

## 常量定义

### MessageType 定义

```javascript
ORG_UPDATED = 11

ORG_MEMBER_JOINED = 202
ORG_MEMBER_LEFT = 203

DISCUSSION_GROUP_CREATED = 12
DISCUSSION_GROUP_UPDATED = 13
DISCUSSION_GROUP_DISBANDED = 20
DISCUSSION_GROUP_MEMBER_JOINED = 16
DISCUSSION_GROUP_MEMBER_LEFT = 17

DEPARTMENT_CREATED = 205
DEPARTMENT_UPDATED = 41
DEPARTMENT_DISBANDED = 42

MEMBER_DEPARTMENTS_UPDATED = 100

USER_UPDATED = 206
APP_ACCOUNT_JOINED = 201

REINITIALIZE_ORG = 200
```

## 推送示例

### 结构说明

推送内容的结构是：

```javascript
{
  "body": {},  # 通知的业务结构，具体见下方
  "created_at": 1395714696,  # 通知产生的时间
  "org_id": 123,  # 这个通知产生于哪个组织
  "operator": 234,  # 操作者id
  "type": 1  # 见上方 MessageType 定义
}
```

以下示例省略这些公共字段，只给出 body 内容。

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

### ORG_MEMBER_JOINED = 202

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

### ORG_MEMBER_LEFT = 203

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

### DEPARTMENT_CREATED = 205

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

### MEMBER_DEPARTMENTS_UPDATED = 100

```javascript
[
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
    "original_is_direct": [
      6,
      7
    ],
    "original_is_not_direct": [
      8,
      9
    ],
    "user_id": 10
  }
]
```

### USER_UPDATED = 206

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
    },
    "member": {
        "id": 1,
        "position": ""
    }
  }
]
```

### APP_ACCOUNT_JOINED = 201

```javascript
{
  "app_account": {
    "avatar_url": "http://some.url",
    "id": 1,
    "name": "考试助手"
  },
  "orgs": [1, 2, 3, 10]
}
```

### REINITIALIZE_ORG = 200

```javascript
{
  "org_id": 1231
}
```

# API 说明

* 所有 HTTP 请求响应均为 JSON，UTF-8 编码，需指定 header：

    ```javascript
    Content-type: application/json
    Accept: application/json
    ```

# 消息

## 发送富文本消息(消息的认证使用http的token)

```javascript
ORG API: POST /orgs/:org_id/messages
```

__参数：__

// 富文本消息

```javascript
{
  "body": {
    "chat": {
      "content": {  // 消息体内容放在content里头
        "title":"老大给你安排了一个xxx考试",
        "examStartTime":"2016-01-01 12-01-02",
        "exameTime":"2小时",
        "url":""
      },
      "apns_summary": "老大给你安排了一个xxx考试"  //apns推送内容
      "type":0 //富文本消息的type
    }
  },
  "app_id":  100, //应用id
  "dest_id": 1,  //推送接收方的id, 注: 接受方所在组织在URL里面(:org_id)
  "dest_type": 1, //推送接收方的类型
  "type": 4  //固定
}
```
