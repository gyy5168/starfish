
try:
    from threading import local
except ImportError:
    from django.utils._threading_local import local

_thread_locals = local()


def get_current_request():
    """ returns the request object for this thead """
    return getattr(_thread_locals, "request", None)


def get_current_user_id():
    r = get_current_request()
    if r and r.session.is_authorized:
        return r.session.user_id
    return 0


def get_current_user():
    r = get_current_request()
    if r and hasattr(r, 'current_user'):
        return r.current_user


def get_current_session_id():
    r = get_current_request()
    if r and r.session.is_authorized:
        return '%s:%s' % (r.session.user_id, r.session.session_key)
    return None


def get_current_org():
    r = get_current_request()
    if r and hasattr(r, 'current_org'):
        return r.current_org


def get_current_org_id():
    r = get_current_request()
    if r and hasattr(r, 'current_org_id'):
        return r.current_org_id


def set_current_request(request):
    _thread_locals.request = request


def get_thread_attr(key, _default=None):
    return getattr(_thread_locals, key, _default)


def set_thread_attr(key, value):
    setattr(_thread_locals, key, value)


def set_read_from_readwrite(flag=True):
    set_thread_attr('read_from_readwrite', flag)


def is_read_from_readwrite():
    return get_thread_attr('read_from_readwrite')


from functools import wraps


def read_from_readwrite_main(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        set_read_from_readwrite(True)
        try:
            return fn(*args, **kwargs)
        except Exception as e:
            raise e
        finally:
            set_read_from_readwrite(False)

    return wrapper
