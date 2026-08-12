document.addEventListener("DOMContentLoaded", function () {
  // 選項對應表
  const phaseActionMap = {
    "Start Phase": [
      "Track Events",
      "Field Events",
      "Event Organization",
      "Logistics & Venue Setup"
    ],
    "In-Progress Phase": [
      "Track Events",
      "Field Events",
      "Score Reporting & Verification",
      "Medical & Safety"
    ],
    "End Phase": [
      "Award Ceremonies",
      "Score Reporting & Verification",
      "Venue Tear-down & Cleaning",
      "Post-Event Review"
    ]
  };

  const actionTaskTypeMap = {
    "Track Events": [
      "Sprints (100m / 200m / 400m)",
      "Middle & Long Distance",
      "Hurdles & Relays"
    ],
    "Field Events": [
      "Jumps (High / Long / Triple)",
      "Throws (Shot Put / Discus / Javelin)"
    ],
    "Event Organization": [
      "Registration & Check-in",
      "Schedule Announcement",
      "Athlete Briefing"
    ],
    "Logistics & Venue Setup": [
      "Equipment Setup",
      "Track & Field Inspection",
      "PA System Setup"
    ],
    "Score Reporting & Verification": [
      "Result Entry",
      "Judges Verification",
      "Leaderboard Update"
    ],
    "Medical & Safety": [
      "First Aid Support",
      "Emergency Response",
      "Track Safety Clearance"
    ],
    "Award Ceremonies": [
      "Medal Presentation",
      "Certificate Distribution",
      "Photo Session"
    ],
    "Venue Tear-down & Cleaning": [
      "Equipment Return",
      "Venue Cleaning",
      "Facility Handover"
    ],
    "Post-Event Review": [
      "Score Summary Filing",
      "Staff Feedback Collection",
      "Incident Report Review"
    ]
  };

  // DOM 元素獲取
  const phaseSelect = document.getElementById("phaseSelect");
  const actionSelect = document.getElementById("actionSelect");
  const taskTypeSelect = document.getElementById("taskTypeSelect");

  // 通用輔助函式：動態填入 <select> 的選項
  function populateSelect(selectElement, options, defaultText) {
    selectElement.innerHTML = `<option value="">${defaultText}</option>`;
    options.forEach((optionText) => {
      const opt = document.createElement("option");
      opt.value = optionText;
      opt.textContent = optionText;
      selectElement.appendChild(opt);
    });
  }

  // 當「階段」變更時，更新「動作」選項
  function updateActionOptions() {
    const selectedPhase = phaseSelect.value;
    const actions = phaseActionMap[selectedPhase] || [];

    populateSelect(actionSelect, actions, "請選擇動作");
    // 重置任務類型選項
    updateTaskTypeOptions();
  }

  // 當「動作」變更時，更新「任務類型」選項
  function updateTaskTypeOptions() {
    const selectedAction = actionSelect.value;
    const taskTypes = actionTaskTypeMap[selectedAction] || [];

    populateSelect(taskTypeSelect, taskTypes, "請選擇任務類型");
  }

  // 綁定動態監聽事件
  if (phaseSelect && actionSelect && taskTypeSelect) {
    phaseSelect.addEventListener("change", updateActionOptions);
    actionSelect.addEventListener("change", updateTaskTypeOptions);
  }
});
