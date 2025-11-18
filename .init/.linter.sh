#!/bin/bash
cd /home/kavia/workspace/code-generation/kaviya-kids-learning-hub-263928-263939/kaviya_backend
source venv/bin/activate
flake8 .
LINT_EXIT_CODE=$?
if [ $LINT_EXIT_CODE -ne 0 ]; then
  exit 1
fi

