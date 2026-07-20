import { Button, Description, Input, Label, ListBox, NumberField, Select, Switch, TextField, Typography } from "@heroui/react";
import { useEffect, useState } from "react";
import { request } from "../util.ts";

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
