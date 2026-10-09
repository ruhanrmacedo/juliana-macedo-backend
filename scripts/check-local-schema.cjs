// Somente leitura; não carrega o ORM nem o setup do Jest.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { Client } = require("pg");
const dotenv = require("dotenv");
const local = dotenv.parse(fs.readFileSync(path.resolve(__dirname, "../.env.development.local")));
assert.equal(local.DB_HOST, "127.0.0.1");
assert.equal(local.DB_PORT, "5432");
assert.equal(local.DB_NAME, "juliana_macedo");
const client = new Client({
  host: "127.0.0.1", port: 5432, database: "juliana_macedo",
  user: local.DB_USER, password: local.DB_PASS, ssl: false,
  connectionTimeoutMillis: 5000,
  options: "-c default_transaction_read_only=on -c statement_timeout=5000",
});
(async () => {
  try {
    await client.connect();
    await client.query("BEGIN READ ONLY");
    const identity = (await client.query(
      "SELECT current_database() AS database, inet_server_addr()::text AS address, inet_server_port() AS port, current_setting('transaction_read_only') AS read_only"
    )).rows[0];
    assert.equal(identity.database, "juliana_macedo");
    assert.equal(identity.address, "127.0.0.1/32");
    assert.equal(identity.port, 5432);
    assert.equal(identity.read_only, "on");
    const required = {
      users: ["id", "email", "password", "role"],
      posts: ["id", "title", "content", "slug", "excerpt", "channel", "format", "status",
        "publishedAt", "isActive", "postType", "views", "created_at", "updated_at",
        "imageUrl", "imageAlt", "imageCaption", "imageCredit",
        "seoTitle", "seoDescription", "isFeatured", "featuredPriority", "authorId",
        "editedById", "categoryId", "authorProfileId"],
      categories: ["id", "name", "slug", "isActive"],
      tags: ["id", "name", "slug"],
      post_tags: ["postId", "tagId"],
      author_profiles: ["id", "displayName", "slug", "headline", "isActive"],
      post_slug_redirects: ["id", "oldSlug", "postId"],
    };
    const rows = (await client.query(
      "SELECT table_name, column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public'"
    )).rows;
    const missing = [];
    for (const [table, columns] of Object.entries(required)) {
      for (const column of columns) {
        if (!rows.some(r => r.table_name === table && r.column_name === column)) missing.push(table + "." + column);
      }
    }
    const authVersion = rows.find(r => r.table_name === "users" && r.column_name === "auth_version");
    const authenticationIssues = [];
    if (!authVersion) {
      authenticationIssues.push("users.auth_version ausente");
    } else {
      if (authVersion.data_type !== "integer") authenticationIssues.push("users.auth_version deve ser integer");
      if (authVersion.is_nullable !== "NO") authenticationIssues.push("users.auth_version deve ser NOT NULL");
      const defaultValue = String(authVersion.column_default ?? "").replace(/[()\s']/g, "");
      if (!/^0(?:::integer|::int4)?$/.test(defaultValue)) authenticationIssues.push("users.auth_version deve ter DEFAULT 0");
    }
    console.log(JSON.stringify({
      identity, missing_editorial_columns: missing,
      authentication_schema_issues: authenticationIssues,
    }));
    assert.equal(missing.length, 0, "Esquema editorial incompleto; nenhuma migration aplicada.");
    assert.equal(authenticationIssues.length, 0, "Esquema de autenticação incompleto; nenhuma migration aplicada.");
    await client.query("ROLLBACK");
    console.log("PASS: esquema editorial verificado somente por leitura.");
  } catch (error) {
    console.error("Falha na verificação local:", error.code || error.name);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
})();
