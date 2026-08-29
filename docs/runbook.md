# MAP-AUTHORING RUNBOOK (things that were slow to discover — do not rediscover)

## GitHub push from VM (auth)
- gh auth token exists but plain extraheader fails. USE:
  git push "https://x-access-token:$(gh auth token)@github.com/Singulary-tee/vexea-map-authoring.git" main
- Repo is PUBLIC (anon pull OK). Commit identity: git -c user.email=oxalpha@localhost -c user.name='Ox Alpha'
  (or set git config once per clone).

## Codespace (supreme-space-train-7vr496j4wwxxfx5p7)
- No 'start' subcommand; it auto-starts on connect: gh cs ssh -c <slug> -- '<cmd>'
- ESM import of 'three' resolves ONLY via node_modules walk-up. Game repo has three at
  /workspaces/vexea-international/node_modules. FIX: ln -sfn /workspaces/vexea-international/node_modules /workspaces/node_modules
  (create before run, rm -f after). NODE_PATH does NOT work for ESM.
- three r184: import('three') returns NAMESPACE (named exports), NOT .default.
- Long jobs: nohup ... > /tmp/x.log 2>&1 & then poll the log (local run_commands caps ~30s).
- VM is 896MB RAM: heavy builds ONLY on codespace; VM = small edits + git + node one-liners.

## Notion MCP flows
- Create page: notion-create-pages (parent omitted = workspace standalone private page).
- IMAGE on page: create-file-upload -> POST file to upload_url via curl with Bearer from
  upload_headers (form field 'file') -> then update-page insert_content with
  <image src="file-upload://<id>"></image>. Uploads EXPIRE FAST (hours) — use immediately.
- create-attachment with content= works for small text/SVG too (returns markdown_source).
- USER MENTION in comment: markdown <mention-user> tag = 500 ERROR. USE rich_text array:
  [{type:'text',text:{content:'...'}},
   {type:'mention',mention:{type:'user',user:{id:'<uuid>',object:'user'}}},
   {type:'text',text:{content:'...'}}]
- My user id: 2c6d872b-594c-8192-8a4d-0002504df8be. Workspace: Alt MMD.
- Mission Control page id: 3cacb9a2-be0b-8145-a5ac-e546402b8ec6

## Releases (storage)
- gh release list/view/download -R Singulary-tee/vexea-map-authoring
- User posts targets/prompts there; 3 redundant copies = same image diff color filters.
- Download pattern: gh release download <tag> -R <repo> -p '<glob>'

## Image ingestion discipline
- ONE image at a time, never bulk. webp preferred (small). file(1) to verify RIFF/WebP first.
- Destroy any >2-3MB raster that has a webp twin in Releases.

## Validator/editor loop
- node tools/blockout-validate.mjs blockout/<file>.json  (exit 0 = green)
- node tools/check-editor-html.mjs (editor sanity)
- node tools/gen-blockout-svg.mjs [blockout.json] [out.svg] (top-down visual for Notion)
- node tools/combine-blockouts.mjs (merge slice+campus -> map-full)
