#!/bin/sh
# Executado pelo container do MySQL apenas na primeira inicialização (volume vazio).
# Cria o banco usado pelos testes automatizados e dá acesso ao usuário da aplicação.
set -e

mysql -uroot -p"$MYSQL_ROOT_PASSWORD" <<SQL
CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}_test\`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}_test\`.* TO '${MYSQL_USER}'@'%';
FLUSH PRIVILEGES;
SQL

echo "Banco de testes ${MYSQL_DATABASE}_test criado."
