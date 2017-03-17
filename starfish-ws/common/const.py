import math


class ConstMetaClass(type):
    def __setattr__(self, name, value):
        raise TypeError("Can't assign value of const(%s)" % name)


class Const(object, metaclass=ConstMetaClass):
    def __new__(cls, *args, **kwargs):
        raise TypeError("Can't create instance of %s" % cls.__name__)


class SolrResourceType(Const):
    (ORG_MEMBER,
     EMAIL,
     TASK,
     TEXT_CHAT,
     PROJECT) = list(range(1, 6))


class SrcType(Const):
    SYSTEM = 0
    ORG_MEMBER = 1
    EXTERNAL_CONTACT = 2
    GENERATED_CONTACT = 4


class PeerType(Const):
    ORG_MEMBER = 0
    DISCUSSION_GROUP = 1
    EXTERNAL_CONTACT = 2
    DEPARTMENT = 3
    GENERATED_CONTACT = 4


class DestType(Const):
    ORG_MEMBER = 0
    DISCUSSION_GROUP = 1
    ORG = 2
    DEPARTMENT = 3
    USER_ORG = 4

    dest_to_peer = {
        ORG_MEMBER: PeerType.ORG_MEMBER,
        DISCUSSION_GROUP: PeerType.DISCUSSION_GROUP,
        DEPARTMENT: PeerType.DEPARTMENT,
    }

    @classmethod
    def to_peer_type(cls, type_):
        return cls.dest_to_peer[type_]


class ResourceType(Const):
    (USER,
     ORG,
     DISCUSSION_GROUP,
     ORG_MEMBER,
     DISCUSSION_GROUP_MEMBER,
     TEXT_CHAT,
     MULTIMEDIA_CHAT,
     INVITATION,
     MAIL,
     TASK) = list(range(10))


class ErrorCode(Const):
    OK = 0
    DUPLICATE_PHONE_NUMBER = 1
    BAD_USERNAME_OR_PASSWORD = 2
    YOU_NEED_SIGN_IN = 3
    PERMISSION_DENIED = 4
    UNKNOWN_ERROR = 5
    DATABASE_ERROR = 6
    NO_SUCH_ORG = 7
    NO_SUCH_DISCUSSION_GROUP = 8
    NO_SUCH_USER = 9
    NO_SUCH_USER_IN_ORG = 10
    NO_SUCH_MESSAGE = 11
    INVALID_DEST_TYPE = 12
    NO_SUCH_INVITATION = 13
    NO_SUCH_TASK = 14
    NO_SUCH_FOLLOWER_DISUSED = 15
    YOU_HAVE_NO_EMAIL_ADDRESS = 16
    EMAIL_ADDRESS_IS_VALID = 17
    INVALID_TOKEN = 18
    TOKEN_EXPIRED = 19
    NO_SUCH_EMAIL = 20
    NO_SUCH_EMAIL_ATTACHMENT = 21
    YOU_HAVE_NO_PHONE = 22
    PHONE_IS_VALID = 23
    ORG_MAIL_SET = 24
    INVALID_AUTH_TOKEN = 25
    INVALID_QUERY_STRING = 26
    DUPLICATE_EMAIL = 27
    ORG_NUMBER_OUT_OF_RANGE = 28
    USER_ALREADY_IN_ORG = 29
    NO_SUCH_MESSAGE_ATTACHMENT = 30
    NO_SUCH_MAIL = 31
    NO_SUCH_CONVERSATION = 32
    BAD_PASSWORD = 33
    NO_VERSION = 34
    NO_SUCH_PROJECT = 35
    ASSIGNEE_NOT_IN_ORG = 36
    CAN_NOT_REMOVE_CREATOR_FROM_DISCUSSION_GROUP = 37
    NO_SUCH_TASK_ATTACHMENT = 38
    FOLLOWER_NOT_IN_ORG_DISUSED = 39
    PROJECT_MEMBER_NOT_IN_ORG = 40
    INVALID_FILENAME = 41
    FILE_EXISTS = 42
    NO_SUCH_DIR = 43
    NO_SUCH_FILE = 44
    DIR_IS_NOT_EMPTY = 45
    FILE_IS_READ_ONLY = 46
    NO_SUCH_DEPARTMENT = 47
    BAD_IMAGE_SIZE = 48
    INVALID_AUTH_TOKEN_TOO_OLD = 49
    BAD_INVITATION_CODE = 50
    NO_SUCH_CONTACT = 51
    WECHAT_SERVER_ERROR = 52
    MISSING_PHONE_AND_TOKEN = 53
    INVALID_AUTH_TOKEN_NO_SESSION = 54
    NO_SUCH_SECTION = 55
    INVALID_MESSAGE_TYPE = 56
    INVALID_EMAIL_ADDR_LOCAL_PART = 57
    INVALID_TARGET = 58
    DIR_EXISTS = 59
    DATETIME_FORMAT_ERROR = 60
    NO_SUCH_TAG = 61
    DOMAIN_OCCUPIED = 62
    CAN_NOT_MODIFY_DOMAIN = 63
    STRING_LENGTH_EXCEED_LIMIT = 64
    ATTACHMENT_EXCEED_LIMIT = 65
    MAIL_BODY_SIZE_EXCEED_LIMIT = 66
    INVALID_PHONE_NUMBER = 67
    INVALID_SEARCH_TYPE = 68
    DOMAIN_MX_RECORDS_ERROR = 69
    ORG_APP_NOT_INSTALL = 70
    FILE_DIR_REPLACE_ERROR = 71
    FILE_ROLE_NOT_SET = 72
    SEARCH_KEYWORD_ERROR = 73
    CAN_NOT_DELETE_DEPARTMENT = 74
    BAD_REQUEST_PARAMS = 75
    MOVE_DIR_ERROR = 76
    CAN_NOT_REMOVE_PERSON_IN_CHARGE = 77
    API_IS_NOT_SUPPORTED = 78
    LOGIN_DOMAIN_NOT_EXISTS = 79
    NO_SUCH_TASK_STATUS = 80
    NO_SUCH_TASK_PRIORITY = 81
    ORG_INVITATION_EXCEED_LIMIT = 82
    PROCESS_MSG_EXCEED_TIME_LIMIT = 83

    error_message = {
        OK: 'OK',
        DUPLICATE_PHONE_NUMBER: 'duplicate phone number',
        BAD_USERNAME_OR_PASSWORD: 'bad username or password',
        YOU_NEED_SIGN_IN: 'you need sign in',
        PERMISSION_DENIED: 'permission denied',
        UNKNOWN_ERROR: 'unknown error',
        DATABASE_ERROR: 'database error',
        NO_SUCH_ORG: 'no such org',
        NO_SUCH_DISCUSSION_GROUP: 'no such discussion group',
        NO_SUCH_USER: 'no such user',
        NO_SUCH_USER_IN_ORG: 'no such user in org',
        NO_SUCH_MESSAGE: 'no such message',
        INVALID_DEST_TYPE: 'invalid dest type',
        NO_SUCH_INVITATION: 'no such invitation',
        NO_SUCH_TASK: 'no such task',
        NO_SUCH_FOLLOWER_DISUSED: 'no such follower',
        YOU_HAVE_NO_EMAIL_ADDRESS: 'you do not have an email address',
        EMAIL_ADDRESS_IS_VALID: 'email address is valid, you do not need to do this',
        INVALID_TOKEN: 'invalid token',
        TOKEN_EXPIRED: 'token expired',
        NO_SUCH_EMAIL: 'no such email',
        NO_SUCH_EMAIL_ATTACHMENT: 'no such email attachment',
        YOU_HAVE_NO_PHONE: 'you do not have a phone number',
        PHONE_IS_VALID: 'phone number is valid, you do not need to do this',
        ORG_MAIL_SET: 'mail address is set',
        INVALID_AUTH_TOKEN: 'invalid auth token',
        INVALID_QUERY_STRING: 'invalid query string',
        DUPLICATE_EMAIL: 'duplicate email address',
        ORG_NUMBER_OUT_OF_RANGE: 'org number out of range',
        USER_ALREADY_IN_ORG: 'user already in org',
        NO_SUCH_MESSAGE_ATTACHMENT: 'no such message attachment',
        NO_SUCH_MAIL: 'no such mail',
        NO_SUCH_CONVERSATION: 'no such conversation',
        BAD_PASSWORD: 'bad original password',
        NO_VERSION: 'no version',
        NO_SUCH_PROJECT: 'no such project',
        ASSIGNEE_NOT_IN_ORG: 'assignee not in org',
        CAN_NOT_REMOVE_CREATOR_FROM_DISCUSSION_GROUP: 'can not remove creator from group',
        NO_SUCH_TASK_ATTACHMENT: 'no such task attachment',
        FOLLOWER_NOT_IN_ORG_DISUSED: 'follower not in org',
        PROJECT_MEMBER_NOT_IN_ORG: 'project member not in org',
        INVALID_FILENAME: 'invalid filename',
        FILE_EXISTS: 'file exists',
        NO_SUCH_DIR: 'no such dir',
        NO_SUCH_FILE: 'no such file',
        DIR_IS_NOT_EMPTY: 'dir is not empty',
        FILE_IS_READ_ONLY: 'file or directory is read-only',
        NO_SUCH_DEPARTMENT: 'no such member group',
        BAD_IMAGE_SIZE: 'bad image size',
        INVALID_AUTH_TOKEN_TOO_OLD: 'invalid auth token, too old',
        BAD_INVITATION_CODE: 'bad invitation code',
        NO_SUCH_CONTACT: 'no such contact',
        WECHAT_SERVER_ERROR: 'wechat server error',
        MISSING_PHONE_AND_TOKEN: 'missing phone and token',
        INVALID_AUTH_TOKEN_NO_SESSION: 'invalid auth token no session',
        NO_SUCH_SECTION: 'no such section',
        INVALID_MESSAGE_TYPE: 'invalid message type',
        INVALID_EMAIL_ADDR_LOCAL_PART: 'invalid email address local part',
        INVALID_TARGET: 'invalid target',
        DIR_EXISTS: 'dir exists',
        DATETIME_FORMAT_ERROR: 'datetime format error',
        NO_SUCH_TAG: 'no such tag',
        DOMAIN_OCCUPIED: 'domain is occupied',
        CAN_NOT_MODIFY_DOMAIN: 'can not modify domain',
        STRING_LENGTH_EXCEED_LIMIT: 'string length exceed limit',
        ATTACHMENT_EXCEED_LIMIT: 'attachment exceed limit',
        MAIL_BODY_SIZE_EXCEED_LIMIT: 'mail body size exceed limit',
        INVALID_PHONE_NUMBER: 'invalid phone number',
        INVALID_SEARCH_TYPE: 'invalid search type',
        DOMAIN_MX_RECORDS_ERROR: 'domain mx records error',
        ORG_APP_NOT_INSTALL: 'org app not install',
        FILE_DIR_REPLACE_ERROR: 'file dir replace error',
        FILE_ROLE_NOT_SET: 'file role not set',
        SEARCH_KEYWORD_ERROR: 'search keyword error',
        CAN_NOT_DELETE_DEPARTMENT: 'can not delete department',
        BAD_REQUEST_PARAMS: 'bad request parameters',
        MOVE_DIR_ERROR: 'move dir error',
        CAN_NOT_REMOVE_PERSON_IN_CHARGE: 'can not remove person in charge',
        API_IS_NOT_SUPPORTED: 'api is not supported',
        LOGIN_DOMAIN_NOT_EXISTS: 'login domain not exists',
        NO_SUCH_TASK_STATUS: 'no such task status',
        NO_SUCH_TASK_PRIORITY: 'no such task priority',
        ORG_INVITATION_EXCEED_LIMIT: 'org invitation exceed limit',
        PROCESS_MSG_EXCEED_TIME_LIMIT: 'process message exceed time limit',
    }

    @staticmethod
    def get_error_message(errcode):
        return ErrorCode.error_message[errcode]


class DefaultStrings(Const):
    ALL_DEPARTMENT_NAME = u"所有人"
    DISCUSSION_GROUP_NAME_PREFIX = u"项目组"


class DateTimeFormat(Const):
    DATETIME = '%Y-%m-%d %H:%M:%S'
    DATE = '%Y-%m-%d'
    TIME = '%H:%M:%S'


class Gender(Const):
    GENDER_MALE = 0
    GENDER_FEMALE = 1
    GENDER_UNKNOWN = 2


class FilePermission(Const):
    VIEW = 0x0001  # can view a file/dir [basic permission for all]
    PREVIEW = 0x0002  # can preview a file
    DOWNLOAD = 0x0004  # can download a file
    SEND = 0x0008  # can send the file/dir to others
    UPLOAD = 0x0010  # can upload a new file/dir
    RENAME = 0x0020  # can rename a file/dir
    # MOVE = 0x0040  # can move a file/dir
    DELETE = 0x0080  # can delete a file/dir

    CONTROL = 0x1000  # can control the file/dir

    @classmethod
    def perm_name(cls, perm):
        for k, v in cls.__dict__.items():
            if not k.startswith('__') and isinstance(v, int) and perm == v:
                return k

    @classmethod
    def list(cls, perm):
        return sorted([k.lower() for k, v in cls.__dict__.items()
                       if not k.startswith('__') and isinstance(v, int) and perm & v])

    @classmethod
    def definition(cls):
        '''return {0: VIEW, 1: PREVIEW, 2: DOWNLOAD...}'''
        return dict((int(math.log(v, 2)), k) for k, v in cls.__dict__.items()
                    if not k.startswith('__') and isinstance(v, int))


class PresetFileRole(Const):
    NONE = 0
    CONTROLLER = 1
    EDITOR = 2
    VIEWER = 3

    viewer_perm = \
        FilePermission.VIEW | \
        FilePermission.PREVIEW | \
        FilePermission.DOWNLOAD | \
        FilePermission.SEND

    editor_perm = viewer_perm | \
        FilePermission.UPLOAD | \
        FilePermission.RENAME | \
        FilePermission.DELETE

    controller_perm = editor_perm | FilePermission.CONTROL

    @classmethod
    def perm_by_role(cls, role):
        return {cls.CONTROLLER: cls.controller_perm,
                cls.EDITOR: cls.editor_perm,
                cls.VIEWER: cls.viewer_perm}.get(role, 0)

    @classmethod
    def role_by_perm(cls, perm):
        for r in (cls.CONTROLLER, cls.EDITOR, cls.VIEWER):
            if perm == cls.perm_by_role(r):
                return r
        return cls.NONE
