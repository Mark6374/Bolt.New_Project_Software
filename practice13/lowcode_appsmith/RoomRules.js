export default {
	// Fictional shared fixture (same as code-based src/contract/sharedFixture.ts)
	bookings: [
		{ id: 1, start: "09:00", end: "10:00", label: "Booking #1" },
		{ id: 2, start: "13:00", end: "14:00", label: "Booking #2" }
	],
	MAX_MINUTES: 120,

	toMin (t) {
		const m = /^(\d{2}):(\d{2})$/.exec(String(t || "").trim());
		if (!m) return null;
		const h = Number(m[1]), mi = Number(m[2]);
		if (h > 23 || mi > 59) return null;
		return h * 60 + mi;
	},
	fmt (n) {
		return String(Math.floor(n / 60)).padStart(2, "0") + ":" + String(n % 60).padStart(2, "0");
	},
	fail (code, message) {
		return { available: false, reasonCode: code, message: message };
	},

	// Layer 1: validation (AC1, AC2, AC6)
	validate (input) {
		const now = this.toMin(input.currentTime);
		if (now === null) return this.fail("INVALID_START", "Current time must be in HH:MM format.");
		const start = this.toMin(input.startTime);
		if (start === null) return this.fail("INVALID_START", "Please enter a start time in HH:MM format.");
		const raw = String(input.duration ?? "").trim();
		if (raw === "" || !/^-?\d+$/.test(raw)) return this.fail("INVALID_DURATION", "Duration must be a whole number of minutes.");
		const duration = Number(raw);
		if (duration <= 0) return this.fail("INVALID_DURATION", "Duration must be greater than 0 minutes.");
		if (duration > this.MAX_MINUTES) return this.fail("DURATION_TOO_LONG", "Duration cannot be longer than 120 minutes.");
		if (start <= now) return this.fail("START_IN_PAST", "Start time must be in the future (now is " + this.fmt(now) + ").");
		if (start + duration > 1440) return this.fail("OUTSIDE_DAY", "The booking must end by 24:00.");
		return { ok: true, start: start, end: start + duration };
	},

	// Layer 2: availability (AC3, AC4); read-only, never changes this.bookings (AC5)
	evaluate (input) {
		const v = this.validate(input);
		if (!v.ok) return v;
		const slot = this.fmt(v.start) + "–" + this.fmt(v.end);
		if (input.blocked) return this.fail("ROOM_BLOCKED", "Unavailable: the room is blocked and cannot be booked.");
		const c = this.bookings.find(b => v.start < this.toMin(b.end) && this.toMin(b.start) < v.end);
		if (c) return this.fail("OVERLAP", "Unavailable: " + slot + " overlaps an existing booking " + c.start + "–" + c.end + ".");
		return { available: true, reasonCode: "AVAILABLE", message: "Available: the room is free " + slot + "." };
	},

	// Layer 3: called by the Check button; result shown by ResultText widget
	// Layer 3 helper for ResultText: validation errors are labelled separately (fix L-D1)
	label (r) {
		if (!r) return "Enter a start time and duration, then press Check availability.";
		const head = r.available ? "✅ AVAILABLE" : (["OVERLAP", "ROOM_BLOCKED"].includes(r.reasonCode) ? "❌ UNAVAILABLE" : "⚠️ INVALID INPUT");
		return head + " — " + r.message + "  |  available=" + r.available + " · reasonCode=" + r.reasonCode + "  |  bookings unchanged: " + appsmith.store.checkUnchanged;
	},

	async check () {
		const before = JSON.stringify(this.bookings);
		const out = this.evaluate({
			currentTime: CurrentTimeInput.text,
			startTime: StartInput.text,
			duration: DurationInput.text,
			blocked: BlockedSwitch.isSwitchedOn
		});
		await storeValue("checkResult", out, false); // persist=false: no stale result after reload (fix L-D2)
		await storeValue("checkUnchanged", JSON.stringify(this.bookings) === before, false);
		return out;
	}
}
