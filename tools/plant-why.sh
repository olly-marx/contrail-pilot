#!/usr/bin/env bash
# The line a caught plant is reported with (stdin = the test's output): the first '- ' line (the test's OWN failing message), else the first FAIL/Error line (a header, a crash, a missing module).
# A bare 'FAIL' header proves nothing about which check went red, so the '- ' line wins.
out=$(cat)
l=$(printf '%s\n' "$out" | grep -E '^ *- ' | head -n 1)
[ -n "$l" ] || l=$(printf '%s\n' "$out" | grep -iE 'FAIL|Error' | head -n 1)
printf '%s' "$l" | sed 's/^ *- *//' | cut -c1-110
