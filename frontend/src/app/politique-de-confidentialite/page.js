"use client";

export default function PolitiqueConfidentialite() {
  return (
    <div>
      <div className="max-w-4xl mx-auto px-4 py-8 text-gray-800 dark:text-zinc-200">
        <h1 className="text-4xl font-bold mb-6">
          Politique de confidentialité
        </h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Dernière mise à jour : 2026
        </p>

        <h2 className="text-2xl font-semibold mb-4 mt-8">
          1. Responsable du traitement
        </h2>
        <p className="mb-6">
          SU-RICE SARL, dont le siège social est sis 53 boulevard Carnot —
          06400 Cannes. SIRET : 95196138200011. Contact :{" "}
          <a
            href="mailto:contact@su-rice.com"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            contact@su-rice.com
          </a>
        </p>

        <h2 className="text-2xl font-semibold mb-4 mt-8">
          2. Données collectées
        </h2>
        <p className="mb-4">
          Dans le cadre de l'utilisation du site www.su-rice.com et de la
          passation de commandes, nous collectons les données suivantes :
        </p>
        <ul className="list-disc ml-6 mb-6 space-y-2">
          <li>Nom, prénom</li>
          <li>Adresse e-mail</li>
          <li>Numéro de téléphone</li>
          <li>Données de connexion et de navigation (cookies)</li>
          <li>
            Données de paiement (traitées exclusivement par PayPlug — non
            conservées par SU-RICE)
          </li>
        </ul>

        <h2 className="text-2xl font-semibold mb-4 mt-8">
          3. Finalités du traitement
        </h2>
        <ul className="list-disc ml-6 mb-6 space-y-2">
          <li>Gestion et suivi des commandes</li>
          <li>Communication avec le client (confirmation, notification)</li>
          <li>Amélioration du service et du site</li>
          <li>Respect des obligations légales et comptables</li>
          <li>Analyse de la fréquentation du site (Vercel Analytics)</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-4 mt-8">
          4. Base légale du traitement
        </h2>
        <ul className="list-disc ml-6 mb-6 space-y-2">
          <li>
            <strong>Exécution d'un contrat</strong> : traitement des commandes
          </li>
          <li>
            <strong>Intérêt légitime</strong> : amélioration du service,
            sécurité
          </li>
          <li>
            <strong>Obligation légale</strong> : conservation des données
            comptables
          </li>
          <li>
            <strong>Consentement</strong> : cookies d'analyse (si applicable)
          </li>
        </ul>

        <h2 className="text-2xl font-semibold mb-4 mt-8">
          5. Durée de conservation
        </h2>
        <ul className="list-disc ml-6 mb-6 space-y-2">
          <li>
            Données de commande : 5 ans (obligation comptable et fiscale)
          </li>
          <li>Données de compte client : jusqu'à suppression du compte</li>
          <li>Données de navigation (cookies) : 13 mois maximum</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-4 mt-8">
          6. Destinataires des données
        </h2>
        <p className="mb-4">
          Les données collectées sont destinées à SU-RICE et peuvent être
          transmises aux sous-traitants suivants dans le cadre strict de
          l'exécution du service :
        </p>
        <ul className="list-disc ml-6 mb-6 space-y-2">
          <li>
            <strong>PayPlug</strong> — traitement des paiements
          </li>
          <li>
            <strong>Vercel</strong> — hébergement du site et analytics
          </li>
          <li>
            <strong>Neon</strong> — hébergement de la base de données
          </li>
          <li>
            <strong>Resend</strong> — envoi d'e-mails transactionnels
          </li>
          <li>
            <strong>Cloudflare</strong> — hébergement des images
          </li>
        </ul>
        <p className="mb-6">
          Ces sous-traitants sont soumis à des obligations contractuelles
          strictes de confidentialité et de sécurité. Aucune donnée n'est
          vendue à des tiers.
        </p>

        <h2 className="text-2xl font-semibold mb-4 mt-8">7. Vos droits</h2>
        <p className="mb-4">
          Conformément au Règlement Général sur la Protection des Données
          (RGPD — Règlement UE 2016/679), vous disposez des droits suivants :
        </p>
        <ul className="list-disc ml-6 mb-6 space-y-2">
          <li>
            <strong>Droit d'accès</strong> : obtenir une copie de vos données
          </li>
          <li>
            <strong>Droit de rectification</strong> : corriger des données
            inexactes
          </li>
          <li>
            <strong>Droit à l'effacement</strong> : demander la suppression de
            vos données
          </li>
          <li>
            <strong>Droit à la limitation</strong> : restreindre certains
            traitements
          </li>
          <li>
            <strong>Droit à la portabilité</strong> : recevoir vos données dans
            un format structuré
          </li>
          <li>
            <strong>Droit d'opposition</strong> : s'opposer à certains
            traitements
          </li>
        </ul>
        <p className="mb-6">
          Pour exercer ces droits, contactez-nous à{" "}
          <a
            href="mailto:contact@su-rice.com"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            contact@su-rice.com
          </a>{" "}
          ou par courrier : SU-RICE, 53 boulevard Carnot, 06400 Cannes. Vous
          pouvez également introduire une réclamation auprès de la{" "}
          <a
            href="https://www.cnil.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            CNIL
          </a>
          .
        </p>

        <h2 className="text-2xl font-semibold mb-4 mt-8">8. Cookies</h2>
        <p className="mb-4">
          Le site utilise des cookies de mesure d'audience via Vercel
          Analytics. Ces cookies permettent d'analyser la fréquentation du
          site de manière anonymisée.
        </p>
        <p className="mb-6">
          Vous pouvez configurer votre navigateur pour refuser les cookies à
          tout moment. Le refus des cookies d'analyse n'affecte pas le
          fonctionnement du site.
        </p>

        <h2 className="text-2xl font-semibold mb-4 mt-8">9. Sécurité</h2>
        <p className="mb-6">
          SU-RICE met en œuvre les mesures techniques et organisationnelles
          appropriées pour protéger vos données contre tout accès non
          autorisé, perte ou altération : chiffrement des communications
          (HTTPS), accès restreint aux données, sous-traitants certifiés.
        </p>

        <h2 className="text-2xl font-semibold mb-4 mt-8">
          10. Modifications
        </h2>
        <p className="mb-6">
          La présente politique peut être mise à jour à tout moment. La date
          de dernière mise à jour est indiquée en haut de page. Nous vous
          invitons à la consulter régulièrement.
        </p>
      </div>
    </div>
  );
}
