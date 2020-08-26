#!/bin/bash

API="http://localhost:4741"
URL_PATH="/posts"

curl "${API}${URL_PATH}/${ID}/comments" \
  --include \
  --request GET \
  --header "Content-Type: application/json" \
--header "Authorization: Bearer ${TOKEN}" \

echo
