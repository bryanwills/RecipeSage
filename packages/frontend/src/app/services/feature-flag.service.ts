import { Injectable } from "@angular/core";
import { environment, IS_SELFHOST } from "../../environments/environment";

export enum FeatureFlagKeys {
  EnableContribution = "enableContribution",
  EnableInstallInstructions = "enableInstallInstructions",
  EnableDiscover = "enableDiscover",
}

export interface FeatureFlagTypes {
  [FeatureFlagKeys.EnableContribution]: boolean;
  [FeatureFlagKeys.EnableInstallInstructions]: boolean;
  [FeatureFlagKeys.EnableDiscover]: boolean;
}

@Injectable({
  providedIn: "root",
})
export class FeatureFlagService {
  flags = {
    [FeatureFlagKeys.EnableContribution]:
      !IS_SELFHOST &&
      !this.isHost(["ios.recipesage.com", "android.recipesage.com"]),
    [FeatureFlagKeys.EnableInstallInstructions]: !this.isHost([
      "windows.recipesage.com",
      "ios.recipesage.com",
      "android.recipesage.com",
    ]),
    [FeatureFlagKeys.EnableDiscover]:
      !IS_SELFHOST &&
      (!environment.production || this.isHost("beta.recipesage.com")),
  } satisfies Record<FeatureFlagKeys, boolean>;

  constructor() {}

  private isHost(host: string | string[]) {
    if (typeof host === "object") {
      return host.includes(window.location.hostname);
    }

    return window.location.hostname === host;
  }
}
