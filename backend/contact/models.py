from django.db import models


class ContactMessage(models.Model):
    """Message du formulaire de contact (lot A8).

    Enregistré avant l'envoi de l'email : si l'envoi échoue, le message
    n'est plus perdu et reste lisible dans l'admin Django.
    """
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    message = models.TextField()
    email_sent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "message de contact"
        verbose_name_plural = "messages de contact"

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.created_at:%d/%m/%Y})"
