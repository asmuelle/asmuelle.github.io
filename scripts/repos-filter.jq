[ .[]
  | select(.fork==false and .archived==false and .disabled==false)
  | select(.pushed_at != null)
  | select(.description != null and (.description|length) > 0)
  | select([.name] | inside($featured) | not)
  | {name, description, language, stargazers_count, html_url, pushed_at}
]
| sort_by(.pushed_at) | reverse | .[0:6]
