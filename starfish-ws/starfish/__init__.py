import logging

logging.getLogger("requests").setLevel(logging.ERROR)
logging.getLogger("kafka").setLevel(logging.ERROR)


def is_org_model(model):
    return getattr(model, 'IS_ORG_MODEL', None) is True
