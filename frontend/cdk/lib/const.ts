
export class Constants {
    public static readonly stackName = process.env.STACK_NAME || "ServerlessGameDemoStack-Web";
    public static readonly templatePrefixName = process.env.TEMPLATE_PREFIX_NAME || this.stackName;
    public static readonly customDomain = process.env.CUSTOM_DOMAIN || "";
    public static readonly useCustomDomain = Constants.customDomain == "" ? "false" : "true";
}