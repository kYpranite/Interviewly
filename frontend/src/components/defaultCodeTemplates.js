// Default code templates for supported languages (LeetCode-style Solution class)
const DEFAULT_CODE_TEMPLATES = {
    python: [
        "class Solution:",
        "    def exampleMethod(self, param1):",
        "        # Write your code here",
        "        return param1"
    ].join("\n"),
    javascript: [
        "class Solution {",
        "    exampleMethod(param1) {",
        "        // Write your code here",
        "        return param1;",
        "    }",
        "}"
    ].join("\n"),
    java: [
        "public class Solution {",
        "    public Object exampleMethod(Object param1) {",
        "        // Write your code here",
        "        return param1;",
        "    }",
        "}"
    ].join("\n"),
    cpp: [
        "class Solution {",
        "public:",
        "    int exampleMethod(int param1) {",
        "        // Write your code here",
        "        return param1;",
        "    }",
        "};"
    ].join("\n"),
};

export default DEFAULT_CODE_TEMPLATES;
