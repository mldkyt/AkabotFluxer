import { Button, Description, Input, Label, ListBox, NumberField, Select, Switch, TextField, Typography } from "@heroui/react";
import { useEffect, useState } from "react";

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
    const channelsFetch = await fetch("/api/text-channels", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    if (!channelsFetch.ok) {
      console.log(channelsFetch);
      alert("Failed to load channels....");
      return;
    }

    const fetchedChannelsJson = await channelsFetch.json() as { id: string; name: string }[];
    setChannels(fetchedChannelsJson);

    const welcomeGoodbyeFetch = await fetch("/api/welcome-goodbye", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    if (!welcomeGoodbyeFetch.ok) {
      console.log(welcomeGoodbyeFetch);
      alert("Failed to load...");
      return;
    }

    const fetchedJson = await welcomeGoodbyeFetch.json() as {
      guildId: string;
      welcomeEnabled: boolean;
      welcomeChannel: string;
      welcomeType: string;
      welcomeTitle: string;
      welcomeContent: string;
      welcomeFirstGracePeriod: number;
      welcomeSecondGracePeriod: number;
      goodbyeEnabled: boolean;
      goodbyeChannel: string;
      goodbyeType: string;
      goodbyeTitle: string;
      goodbyeContent: string;
    };

    setWelcomeEnabled(fetchedJson.welcomeEnabled);
    setGoodbyeEnabled(fetchedJson.goodbyeEnabled);

    setWelcomeChannel(fetchedJson.welcomeChannel);
    setGoodbyeChannel(fetchedJson.goodbyeChannel);

    setWelcomeType(fetchedJson.welcomeType as "embed" | "text");
    setGoodbyeType(fetchedJson.goodbyeType as "embed" | "text");

    setWelcomeTitle(fetchedJson.welcomeTitle);
    setGoodbyeTitle(fetchedJson.goodbyeTitle);

    setWelcomeContent(fetchedJson.welcomeContent);
    setGoodbyeContent(fetchedJson.goodbyeContent);
  };

  const saveSettings = async () => {
    const req = await fetch("/api/welcome-goodbye", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
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
      }),
    });

    if (!req.ok) {
      alert(await req.text());
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <>
      <Typography type="h1">Welcome & Goodbye</Typography>
      <Typography>Welcome new users and say goodbye to those who leave!</Typography>

      <div className="flex flex-col gap-2">
        <Switch isSelected={welcomeEnabled} onChange={setWelcomeEnabled}>
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Welcome Messages
          </Switch.Content>
        </Switch>

        {welcomeEnabled && (
          <>
            <Select value={welcomeChannel} onChange={(x) => setWelcomeChannel(x?.toString() ?? "")}>
              <Label>Welcome Channel</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {channels.map((channel) => (
                    <ListBox.Item key={channel.id} id={channel.id} textValue={`#${channel.name}`}>
                      #{channel.name}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            <Select value={welcomeType} onChange={(x) => setWelcomeType((x?.toString() ?? "text") as "embed" | "text")}>
              <Label>Welcome Message Type</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="embed" textValue="Embed">
                    Embed
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item id="text" textValue="Text">
                    Text
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>

            {welcomeType === "embed" && (
              <TextField value={welcomeTitle} onChange={(title) => setWelcomeTitle(title)}>
                <Label>Welcome Embed Title</Label>
                <Input type="text" min={1} max={50} />
              </TextField>
            )}

            <TextField value={welcomeContent} onChange={(content) => setWelcomeContent(content)}>
              <Label>Welcome Message</Label>
              <Input type="text" min={1} max={50} />
            </TextField>

            <NumberField value={welcomeFirstGracePeriod} onChange={(num) => setWelcomeFirstGracePeriod(num)} minValue={0} maxValue={60}>
              <Label>First Grace Period</Label>
              <NumberField.Group>
                <NumberField.DecrementButton />
                <NumberField.Input />
                <NumberField.IncrementButton />
              </NumberField.Group>
              <Description>
                The grace period in seconds between joining and before the welcome message is sent. You can set this to a higher value to prevent sending a welcome message when the member gets kicked
                by a bot.
              </Description>
            </NumberField>

            <NumberField value={welcomeSecondGracePeriod} onChange={(num) => setWelcomeSecondGracePeriod(num)} minValue={0} maxValue={600}>
              <Label>Second Grace Period</Label>
              <NumberField.Group>
                <NumberField.DecrementButton />
                <NumberField.Input />
                <NumberField.IncrementButton />
              </NumberField.Group>
              <Description>
                The grace period in seconds between the message being sent and before making the welcome message permanent. If the member leaves the server during this period, the welcome message is
                deleted and the goodbye message is not created.
              </Description>
            </NumberField>
          </>
        )}

        <Switch isSelected={goodbyeEnabled} onChange={setGoodbyeEnabled}>
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Goodbye Messages
          </Switch.Content>
        </Switch>

        {goodbyeEnabled && (
          <>
            <Select value={goodbyeChannel} onChange={(x) => setGoodbyeChannel(x?.toString() ?? "")}>
              <Label>Goodbye Channel</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {channels.map((channel) => (
                    <ListBox.Item key={channel.id} id={channel.id} textValue={`#${channel.name}`}>
                      #{channel.name}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            <Select value={goodbyeType} onChange={(x) => setGoodbyeType((x?.toString() ?? "text") as "embed" | "text")}>
              <Label>Welcome Message Type</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="embed" textValue="Embed">
                    Embed
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item id="text" textValue="Text">
                    Text
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>

            {goodbyeType === "embed" && (
              <TextField value={goodbyeTitle} onChange={(title) => setGoodbyeTitle(title)}>
                <Label>Goodbye Embed Title</Label>
                <Input type="text" min={1} max={50} />
              </TextField>
            )}

            <TextField value={goodbyeContent} onChange={(content) => setGoodbyeContent(content)}>
              <Label>Goodbye Message</Label>
              <Input type="text" min={1} max={50} />
            </TextField>
          </>
        )}

        <Button onClick={saveSettings}>Save settings</Button>
      </div>
    </>
  );
};

export default WelcomeGoodbye;
