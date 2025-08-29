import Clock from "lucide-react/dist/esm/icons/clock.js";
import Medal from "lucide-react/dist/esm/icons/medal.js";
import TrendingUp from "lucide-react/dist/esm/icons/trending-up.js";
import * as s from "../page.css";

export function getSectionHeader(sectionName: string) {
  if (sectionName === "top") {
    return {
      icon: (
        <Medal
          className={s.sectionHeaderIcon}
          width={20}
          height={20}
          aria-hidden
        />
      ),
      title: "Top Rated",
    };
  }

  if (sectionName === "trending") {
    return {
      icon: (
        <TrendingUp
          className={s.sectionHeaderIcon}
          width={20}
          height={20}
          aria-hidden
        />
      ),
      title: "Trending Now",
    };
  }

  return {
    icon: (
      <Clock
        className={s.sectionHeaderIcon}
        width={20}
        height={20}
        aria-hidden
      />
    ),
    title: "New Arrivals",
  };
}
