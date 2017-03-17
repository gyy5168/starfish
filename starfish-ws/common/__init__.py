class Singleton(type):
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super(Singleton, cls).__call__(*args, **kwargs)

        return cls._instances[cls]


class AutoRegistMetaClass(type):
    def __new__(cls, name, bases, dct):
        _cls = super(AutoRegistMetaClass, cls).__new__(cls, name, bases, dct)
        regist_keys = _cls.regist_keys()
        if regist_keys:
            all_keys = regist_keys if isinstance(regist_keys, (list, tuple)) else [regist_keys]

            for regist_key in all_keys:
                if regist_key in _cls._REGISTED:
                    raise TypeError('AutoRegist: duplicated key "%s" for class: %s, %s'
                                    % (regist_key, _cls, _cls._REGISTED[regist_key]))
                _cls._REGISTED[regist_key] = _cls
        return _cls


class AutoRegistryBase(object, metaclass=AutoRegistMetaClass):
    REGIST_KEY = None

    @classmethod
    def regist_keys(cls):
        '''return a not None key or a list/tuple of keys'''
        return cls.REGIST_KEY or cls.__name__

    _REGISTED = {}

    @classmethod
    def registed(cls, regist_key):
        return cls._REGISTED.get(regist_key)
