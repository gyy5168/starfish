from django.db.models.signals import post_save
from django.dispatch.dispatcher import receiver

from apps.message.models import Message


@receiver(post_save, sender=Message)
def send_message_on_message_saved(sender, instance, **kwargs):
    if not kwargs['created']:
        return

    content = instance._snapshot or Message._load_resource(instance)
    if content:
        instance.sendout(content)
