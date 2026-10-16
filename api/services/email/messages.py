"""Copy for every transactional email, in the eight languages the app ships.

One module so a new language is one edit, and so nothing in the product can
send a customer an English-only email by accident. Each entry is
(subject, heading, paragraphs, button label, note). `{hours}` and `{minutes}`
are filled in at render time; nothing else is interpolated into the copy.
"""

from __future__ import annotations

from dataclasses import dataclass

from api.services.email.layout import Button, plain, render

SUPPORTED = ("en", "fr", "es", "de", "it", "pt", "ru", "zh")


@dataclass(frozen=True)
class Copy:
    subject: str
    heading: str
    paragraphs: tuple[str, ...]
    button: str | None = None
    note: str | None = None
    preheader: str | None = None


def _lang(locale: str | None) -> str:
    return locale if locale in SUPPORTED else "en"


# --------------------------------------------------------------------------
# Confirm the address at sign-up
# --------------------------------------------------------------------------
VERIFY: dict[str, Copy] = {
    "en": Copy(
        "Confirm your Voice AiLunaPro account",
        "Confirm your email address",
        ("Welcome to Voice AiLunaPro. Confirm your address and your account is live — your free trial starts the moment you do.",),
        "Confirm my email",
        "If you did not create an account, you can ignore this email and nothing will happen.",
        "One click and your account is active.",
    ),
    "fr": Copy(
        "Confirmez votre compte Voice AiLunaPro",
        "Confirmez votre adresse e-mail",
        ("Bienvenue sur Voice AiLunaPro. Confirmez votre adresse et votre compte est actif — votre essai gratuit démarre dans la foulée.",),
        "Confirmer mon e-mail",
        "Si vous n'avez pas créé de compte, ignorez cet e-mail : rien ne se passera.",
        "Un clic et votre compte est actif.",
    ),
    "es": Copy(
        "Confirma tu cuenta de Voice AiLunaPro",
        "Confirma tu dirección de correo",
        ("Bienvenido a Voice AiLunaPro. Confirma tu dirección y tu cuenta queda activa — tu prueba gratuita empieza en ese momento.",),
        "Confirmar mi correo",
        "Si no creaste una cuenta, ignora este correo: no ocurrirá nada.",
        "Un clic y tu cuenta está activa.",
    ),
    "de": Copy(
        "Bestätigen Sie Ihr Voice-AiLunaPro-Konto",
        "Bestätigen Sie Ihre E-Mail-Adresse",
        ("Willkommen bei Voice AiLunaPro. Bestätigen Sie Ihre Adresse, und Ihr Konto ist aktiv — Ihre kostenlose Testphase startet sofort.",),
        "E-Mail bestätigen",
        "Wenn Sie kein Konto erstellt haben, ignorieren Sie diese E-Mail einfach.",
        "Ein Klick, und Ihr Konto ist aktiv.",
    ),
    "it": Copy(
        "Conferma il tuo account Voice AiLunaPro",
        "Conferma il tuo indirizzo e-mail",
        ("Benvenuto in Voice AiLunaPro. Conferma il tuo indirizzo e l'account è attivo — la prova gratuita parte subito dopo.",),
        "Conferma la mia e-mail",
        "Se non hai creato un account, ignora questa e-mail: non succederà nulla.",
        "Un clic e il tuo account è attivo.",
    ),
    "pt": Copy(
        "Confirme a sua conta Voice AiLunaPro",
        "Confirme o seu endereço de e-mail",
        ("Bem-vindo ao Voice AiLunaPro. Confirme o seu endereço e a conta fica ativa — o período gratuito começa nesse momento.",),
        "Confirmar o meu e-mail",
        "Se não criou uma conta, ignore este e-mail: nada acontecerá.",
        "Um clique e a sua conta fica ativa.",
    ),
    "ru": Copy(
        "Подтвердите аккаунт Voice AiLunaPro",
        "Подтвердите адрес эл. почты",
        ("Добро пожаловать в Voice AiLunaPro. Подтвердите адрес — аккаунт станет активным, и сразу начнётся бесплатный период.",),
        "Подтвердить адрес",
        "Если вы не создавали аккаунт, просто проигнорируйте это письмо.",
        "Один клик — и аккаунт активен.",
    ),
    "zh": Copy(
        "确认您的 Voice AiLunaPro 账户",
        "确认您的邮箱地址",
        ("欢迎使用 Voice AiLunaPro。确认邮箱后账户即刻生效，免费试用同时开始。",),
        "确认邮箱",
        "如果您没有创建账户，忽略此邮件即可，不会有任何变化。",
        "一次点击，账户即刻生效。",
    ),
}

# --------------------------------------------------------------------------
# Forgotten password
# --------------------------------------------------------------------------
RESET: dict[str, Copy] = {
    "en": Copy(
        "Reset your Voice AiLunaPro password",
        "Set a new password",
        (
            "We received a request to reset the password for this address. Choose a new one with the button below.",
            "This link works once and expires in {minutes} minutes.",
        ),
        "Choose a new password",
        "If you did not ask for this, ignore this email — your password stays unchanged and your account is untouched.",
        "A single-use link to set a new password.",
    ),
    "fr": Copy(
        "Réinitialisez votre mot de passe Voice AiLunaPro",
        "Choisissez un nouveau mot de passe",
        (
            "Nous avons reçu une demande de réinitialisation du mot de passe pour cette adresse. Choisissez-en un nouveau avec le bouton ci-dessous.",
            "Ce lien est à usage unique et expire dans {minutes} minutes.",
        ),
        "Choisir un nouveau mot de passe",
        "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : votre mot de passe reste inchangé et votre compte n'est pas touché.",
        "Un lien à usage unique pour changer de mot de passe.",
    ),
    "es": Copy(
        "Restablece tu contraseña de Voice AiLunaPro",
        "Elige una nueva contraseña",
        (
            "Hemos recibido una solicitud para restablecer la contraseña de esta dirección. Elige una nueva con el botón de abajo.",
            "Este enlace es de un solo uso y caduca en {minutes} minutos.",
        ),
        "Elegir una nueva contraseña",
        "Si no lo has solicitado, ignora este correo: tu contraseña no cambia y tu cuenta sigue intacta.",
        "Un enlace de un solo uso para cambiar la contraseña.",
    ),
    "de": Copy(
        "Setzen Sie Ihr Voice-AiLunaPro-Passwort zurück",
        "Neues Passwort festlegen",
        (
            "Für diese Adresse wurde ein Zurücksetzen des Passworts angefordert. Legen Sie über die Schaltfläche unten ein neues fest.",
            "Der Link funktioniert einmal und läuft in {minutes} Minuten ab.",
        ),
        "Neues Passwort wählen",
        "Wenn Sie das nicht angefordert haben, ignorieren Sie diese E-Mail — Ihr Passwort bleibt unverändert.",
        "Ein einmalig gültiger Link für ein neues Passwort.",
    ),
    "it": Copy(
        "Reimposta la password di Voice AiLunaPro",
        "Scegli una nuova password",
        (
            "Abbiamo ricevuto una richiesta di reimpostazione della password per questo indirizzo. Scegline una nuova con il pulsante qui sotto.",
            "Il link è valido una sola volta e scade tra {minutes} minuti.",
        ),
        "Scegli una nuova password",
        "Se non sei stato tu, ignora questa e-mail: la password resta invariata e l'account non viene toccato.",
        "Un link monouso per cambiare password.",
    ),
    "pt": Copy(
        "Redefina a sua palavra-passe Voice AiLunaPro",
        "Defina uma nova palavra-passe",
        (
            "Recebemos um pedido para redefinir a palavra-passe deste endereço. Escolha uma nova com o botão abaixo.",
            "Esta ligação funciona uma só vez e expira em {minutes} minutos.",
        ),
        "Escolher nova palavra-passe",
        "Se não foi você, ignore este e-mail: a palavra-passe não muda e a conta fica intacta.",
        "Uma ligação de uso único para mudar a palavra-passe.",
    ),
    "ru": Copy(
        "Сброс пароля Voice AiLunaPro",
        "Задайте новый пароль",
        (
            "Мы получили запрос на сброс пароля для этого адреса. Задайте новый по кнопке ниже.",
            "Ссылка одноразовая и действует {minutes} минут.",
        ),
        "Задать новый пароль",
        "Если вы этого не запрашивали, проигнорируйте письмо — пароль останется прежним, аккаунт не изменится.",
        "Одноразовая ссылка для смены пароля.",
    ),
    "zh": Copy(
        "重置您的 Voice AiLunaPro 密码",
        "设置新密码",
        (
            "我们收到了该邮箱的密码重置请求。请通过下方按钮设置新密码。",
            "该链接仅可使用一次，{minutes} 分钟后失效。",
        ),
        "设置新密码",
        "如果这不是您本人的操作，请忽略此邮件：密码不会更改，账户也不受影响。",
        "一次性密码重置链接。",
    ),
}

# --------------------------------------------------------------------------
# Password actually changed - the one email nobody asks for and everybody needs
# --------------------------------------------------------------------------
CHANGED: dict[str, Copy] = {
    "en": Copy(
        "Your Voice AiLunaPro password was changed",
        "Your password was changed",
        ("The password for this account has just been changed. You can sign in with it right away.",),
        "Sign in",
        "If this was not you, reset your password immediately and write to us at service@ailunapro.com.",
        "Confirmation that your password changed.",
    ),
    "fr": Copy(
        "Votre mot de passe Voice AiLunaPro a été modifié",
        "Votre mot de passe a été modifié",
        ("Le mot de passe de ce compte vient d'être modifié. Vous pouvez vous connecter avec dès maintenant.",),
        "Se connecter",
        "Si vous n'êtes pas à l'origine de ce changement, réinitialisez votre mot de passe immédiatement et écrivez-nous à service@ailunapro.com.",
        "Confirmation du changement de mot de passe.",
    ),
    "es": Copy(
        "Tu contraseña de Voice AiLunaPro ha cambiado",
        "Tu contraseña ha cambiado",
        ("La contraseña de esta cuenta acaba de cambiar. Ya puedes iniciar sesión con ella.",),
        "Iniciar sesión",
        "Si no has sido tú, restablece la contraseña de inmediato y escríbenos a service@ailunapro.com.",
        "Confirmación del cambio de contraseña.",
    ),
    "de": Copy(
        "Ihr Voice-AiLunaPro-Passwort wurde geändert",
        "Ihr Passwort wurde geändert",
        ("Das Passwort dieses Kontos wurde soeben geändert. Sie können sich sofort damit anmelden.",),
        "Anmelden",
        "Waren Sie das nicht, setzen Sie Ihr Passwort sofort zurück und schreiben Sie an service@ailunapro.com.",
        "Bestätigung der Passwortänderung.",
    ),
    "it": Copy(
        "La tua password Voice AiLunaPro è stata modificata",
        "La password è stata modificata",
        ("La password di questo account è appena stata modificata. Puoi accedere subito con la nuova.",),
        "Accedi",
        "Se non sei stato tu, reimposta subito la password e scrivici a service@ailunapro.com.",
        "Conferma della modifica della password.",
    ),
    "pt": Copy(
        "A sua palavra-passe Voice AiLunaPro foi alterada",
        "A sua palavra-passe foi alterada",
        ("A palavra-passe desta conta acabou de ser alterada. Já pode entrar com ela.",),
        "Entrar",
        "Se não foi você, redefina a palavra-passe imediatamente e escreva para service@ailunapro.com.",
        "Confirmação da alteração da palavra-passe.",
    ),
    "ru": Copy(
        "Пароль Voice AiLunaPro изменён",
        "Ваш пароль изменён",
        ("Пароль этого аккаунта только что изменён. Вы уже можете войти с новым паролем.",),
        "Войти",
        "Если это были не вы, немедленно сбросьте пароль и напишите нам на service@ailunapro.com.",
        "Подтверждение смены пароля.",
    ),
    "zh": Copy(
        "您的 Voice AiLunaPro 密码已更改",
        "密码已更改",
        ("此账户的密码刚刚被更改，您现在可以使用新密码登录。",),
        "登录",
        "如果这不是您本人的操作，请立即重置密码并联系 service@ailunapro.com。",
        "密码更改确认。",
    ),
}

# --------------------------------------------------------------------------
# Account confirmed - the one moment the customer is most willing to start
# --------------------------------------------------------------------------
WELCOME: dict[str, Copy] = {
    "en": Copy(
        "Your Voice AiLunaPro account is ready",
        "You're in. Build your first agent.",
        (
            "Your account is confirmed and your free trial is running. Describe what the agent should say, connect your number, and it answers calls for you.",
            "Most people have a working agent in under ten minutes.",
        ),
        "Open my dashboard",
        "Stuck on something? Reply to this email — it reaches a person, not a robot.",
        "Your account is confirmed and the trial has started.",
    ),
    "fr": Copy(
        "Votre compte Voice AiLunaPro est prêt",
        "C'est parti. Créez votre premier agent.",
        (
            "Votre compte est confirmé et votre essai gratuit tourne. Décrivez ce que l'agent doit dire, branchez votre numéro, et il répond aux appels à votre place.",
            "La plupart des utilisateurs ont un agent opérationnel en moins de dix minutes.",
        ),
        "Ouvrir mon tableau de bord",
        "Un blocage ? Répondez à cet e-mail — vous tombez sur une personne, pas sur un robot.",
        "Votre compte est confirmé, l'essai a commencé.",
    ),
    "es": Copy(
        "Tu cuenta de Voice AiLunaPro está lista",
        "Ya estás dentro. Crea tu primer agente.",
        (
            "Tu cuenta está confirmada y tu prueba gratuita está en marcha. Describe lo que debe decir el agente, conecta tu número y contestará las llamadas por ti.",
            "La mayoría tiene un agente funcionando en menos de diez minutos.",
        ),
        "Abrir mi panel",
        "¿Algo no encaja? Responde a este correo: te contesta una persona, no un robot.",
        "Tu cuenta está confirmada y la prueba ha empezado.",
    ),
    "de": Copy(
        "Ihr Voice-AiLunaPro-Konto ist bereit",
        "Los geht's. Erstellen Sie Ihren ersten Agenten.",
        (
            "Ihr Konto ist bestätigt und die kostenlose Testphase läuft. Beschreiben Sie, was der Agent sagen soll, verbinden Sie Ihre Nummer — und er nimmt Anrufe für Sie entgegen.",
            "Die meisten haben in unter zehn Minuten einen funktionierenden Agenten.",
        ),
        "Dashboard öffnen",
        "Irgendwo hängen geblieben? Antworten Sie einfach auf diese E-Mail — dort sitzt ein Mensch.",
        "Konto bestätigt, Testphase gestartet.",
    ),
    "it": Copy(
        "Il tuo account Voice AiLunaPro è pronto",
        "Ci sei. Crea il tuo primo agente.",
        (
            "Il tuo account è confermato e la prova gratuita è attiva. Descrivi cosa deve dire l'agente, collega il tuo numero e risponderà alle chiamate al posto tuo.",
            "Per la maggior parte delle persone bastano meno di dieci minuti.",
        ),
        "Apri la dashboard",
        "Qualcosa non torna? Rispondi a questa e-mail: dall'altra parte c'è una persona.",
        "Account confermato, prova avviata.",
    ),
    "pt": Copy(
        "A sua conta Voice AiLunaPro está pronta",
        "Está dentro. Crie o seu primeiro agente.",
        (
            "A sua conta está confirmada e o período gratuito está a correr. Descreva o que o agente deve dizer, ligue o seu número e ele atende as chamadas por si.",
            "A maioria tem um agente a funcionar em menos de dez minutos.",
        ),
        "Abrir o meu painel",
        "Preso nalguma coisa? Responda a este e-mail — do outro lado está uma pessoa.",
        "Conta confirmada, período gratuito iniciado.",
    ),
    "ru": Copy(
        "Ваш аккаунт Voice AiLunaPro готов",
        "Готово. Создайте первого агента.",
        (
            "Аккаунт подтверждён, бесплатный период идёт. Опишите, что должен говорить агент, подключите номер — и он будет отвечать на звонки за вас.",
            "У большинства рабочий агент готов меньше чем за десять минут.",
        ),
        "Открыть панель",
        "Что-то не получается? Ответьте на это письмо — его читает человек.",
        "Аккаунт подтверждён, период начался.",
    ),
    "zh": Copy(
        "您的 Voice AiLunaPro 账户已就绪",
        "开始吧，创建第一个语音代理。",
        (
            "账户已确认，免费试用已开始。描述代理该说什么，接入您的号码，它就能替您接听电话。",
            "多数用户在十分钟内就能让代理跑起来。",
        ),
        "打开控制台",
        "遇到问题？直接回复这封邮件——另一端是真人。",
        "账户已确认，试用已开始。",
    ),
}


def build(
    kind: dict[str, Copy],
    *,
    locale: str | None,
    url: str | None = None,
    facts: list[tuple[str, str]] | None = None,
    **fmt,
) -> tuple[str, str, str]:
    """Return (subject, text, html) for one message in the caller's language."""
    lang = _lang(locale)
    copy = kind.get(lang, kind["en"])
    paragraphs = [p.format(**fmt) if fmt else p for p in copy.paragraphs]
    button = Button(copy.button, url) if copy.button and url else None
    html = render(
        locale=lang,
        heading=copy.heading,
        paragraphs=paragraphs,
        button=button,
        facts=facts,
        note=copy.note,
        preheader=copy.preheader,
    )
    text = plain(
        heading=copy.heading,
        paragraphs=paragraphs,
        link=url,
        facts=facts,
        note=copy.note,
    )
    return copy.subject, text, html
