import { useEffect, useState } from "react";
import { request } from "../util.ts";
import { Button, Input, Label, NumberField, Select, Switch } from "./ui/index.ts";

const WelcomeGoodbye = () => {
  const [welcomeEnabled, setWelcomeEnabled] = useState(false);
  const [welcomeChannel, setWelcomeChannel] = useState("");
  const [welcomeType, setWelcomeType] = useState<"embed" | "text">("text");
  const [welcomeTitle, setWelcomeTitle] = useState("");
  const [welcomeContent, setWelcomeContent] = useState("");
  const [welcomeFirstGracePeriod, setWelcomeFirstGracePeriod] = useState(5);
  const [welcomeSecondGracePeriod, setWelcomeSecondGracePeriod] = useState(10);

  const [goodbyeEnabled, setGoodbyeEnabled] = useState(false);
  const [goodbyeChannel, setGoodbyeChannel] = useState("");
  const [goodbyeType, setGoodbyeType] = useState<"embed" | "text">("text");
  const [goodbyeTitle, setGoodbyeTitle] = useState("");
  const [goodbyeContent, setGoodbyeContent] = useState("");

  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);

  const fetchSettings = async () => {
    const channelsFetch = await request("GET", "/api/text-channels");
    if (!channelsFetch.ok) {
      return;
    }
    setChannels(channelsFetch.data);

    const welcomeGoodbyeFetch = await request("GET", "/api/welcome-goodbye");
    if (!welcomeGoodbyeFetch.ok) {
      return;
    }

    setWelcomeEnabled(welcomeGoodbyeFetch.data.welcomeEnabled);
    setGoodbyeEnabled(welcomeGoodbyeFetch.data.goodbyeEnabled);

    setWelcomeChannel(welcomeGoodbyeFetch.data.welcomeChannel);
    setGoodbyeChannel(welcomeGoodbyeFetch.data.goodbyeChannel);

    setWelcomeType(welcomeGoodbyeFetch.data.welcomeType as "embed" | "text");
    setGoodbyeType(welcomeGoodbyeFetch.data.goodbyeType as "embed" | "text");

    setWelcomeTitle(welcomeGoodbyeFetch.data.welcomeTitle);
    setGoodbyeTitle(welcomeGoodbyeFetch.data.goodbyeTitle);

    setWelcomeContent(welcomeGoodbyeFetch.data.welcomeContent);
    setGoodbyeContent(welcomeGoodbyeFetch.data.goodbyeContent);
  };

  const saveSettings = async () => {
    await request("POST", "/api/welcome-goodbye", {
      welcomeEnabled,
      goodbyeEnabled,

      welcomeChannel,
      goodbyeChannel,

      welcomeType,
      goodbyeType,

      welcomeTitle,
      goodbyeTitle,

      welcomeContent,
      goodbyeContent,

      welcomeFirstGracePeriod,
      welcomeSecondGracePeriod,
    });
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <div>
      <h2>Welcome & Goodbye</h2>
      <div className="flex flex-col gap-2">
        <Switch checked={welcomeEnabled} onChange={setWelcomeEnabled} label="Welcome Messages" />

        {welcomeEnabled && (
          <>
            <Select value={welcomeChannel} onChange={setWelcomeChannel} label="Welcome Channel">
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  #{channel.name}
                </option>
              ))}
            </Select>

            <Select value={welcomeType} onChange={(x) => setWelcomeType(x as "embed" | "text")} label="Welcome Message Type">
              <option value="embed">Embed</option>
              <option value="text">Text</option>
            </Select>

            {welcomeType === "embed" && (
              <div className="field">
                <Label>Welcome Embed Title</Label>
                <Input type="text" value={welcomeTitle} onChange={setWelcomeTitle} minLength={1} maxLength={50} />
              </div>
            )}

            <div className="field">
              <Label>Welcome Message</Label>
              <Input type="text" value={welcomeContent} onChange={setWelcomeContent} minLength={1} maxLength={50} />
            </div>

            <NumberField value={welcomeFirstGracePeriod} onChange={setWelcomeFirstGracePeriod} minValue={0} maxValue={60} label="First Grace Period" />
            <NumberField value={welcomeSecondGracePeriod} onChange={setWelcomeSecondGracePeriod} minValue={0} maxValue={600} label="Second Grace Period" />
          </>
        )}

        <Switch checked={goodbyeEnabled} onChange={setGoodbyeEnabled} label="Goodbye Messages" />

        {goodbyeEnabled && (
          <>
            <Select value={goodbyeChannel} onChange={setGoodbyeChannel} label="Goodbye Channel">
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  #{channel.name}
                </option>
              ))}
            </Select>

            <Select value={goodbyeType} onChange={(x) => setGoodbyeType(x as "embed" | "text")} label="Goodbye Message Type">
              <option value="embed">Embed</option>
              <option value="text">Text</option>
            </Select>

            {goodbyeType === "embed" && (
              <div className="field">
                <Label>Goodbye Embed Title</Label>
                <Input type="text" value={goodbyeTitle} onChange={setGoodbyeTitle} minLength={1} maxLength={50} />
              </div>
            )}

            <div className="field">
              <Label>Goodbye Message</Label>
              <Input type="text" value={goodbyeContent} onChange={setGoodbyeContent} minLength={1} maxLength={50} />
            </div>
          </>
        )}

        <Button onClick={saveSettings}>Save settings</Button>
      </div>
    </div>
  );
};

export default WelcomeGoodbye;