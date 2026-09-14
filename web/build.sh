#!/bin/bash

deno task build && rm -rf ../bot/dist/ && cp -r dist/ ../bot/
