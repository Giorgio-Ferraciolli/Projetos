# Certificados raiz extras (opcional)

Se a sua rede usa um proxy com inspeção TLS (ex.: Zscaler, Netskope), os downloads
feitos durante o build das imagens (`pip install`, `npm ci`) falham com erros como
`CERTIFICATE_VERIFY_FAILED` ou `SELF_SIGNED_CERT_IN_CHAIN`.

Para resolver, coloque aqui o certificado raiz do proxy em formato PEM, com extensão
`.crt`. Os Dockerfiles do backend e do frontend confiam automaticamente em todos os
arquivos `*.crt` desta pasta.

No Windows, é possível exportar o certificado com PowerShell (troque o filtro pelo nome
da sua CA):

```powershell
$c = Get-ChildItem Cert:\LocalMachine\Root | Where-Object Subject -like "*Zscaler Root CA*" | Select-Object -First 1
$pem = "-----BEGIN CERTIFICATE-----`n" + [Convert]::ToBase64String($c.RawData, 'InsertLineBreaks') + "`n-----END CERTIFICATE-----`n"
[IO.File]::WriteAllText("$PWD\infrastructure\certs\corporate-root-ca.crt", $pem)
```

Os arquivos `*.crt` desta pasta são ignorados pelo Git. Sem nenhum certificado aqui,
o build funciona normalmente em redes sem inspeção TLS.
