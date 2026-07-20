import { Button, FieldError, Form, Input, type Key, Label, ListBox, Modal, Select, Surface, Table, TextField, toast, Typography, useOverlayState } from "@heroui/react";
import { useEffect, useState } from "react";
import { Skeleton } from "@heroui/react/skeleton";
import { request } from "../util.ts";

const ReactionRoles = () => {
  const [loading, setLoading] = useState(true);
  const [iamRoles, setIamRoles] = useState<{ roleId: string; roleName: string; tag: string }[]>([]);
  const [roles, setRoles] = useState<{ name: string; id: string }[]>([]);

  const [addNewRole, setAddNewRole] = useState<Key | null>("");
  const [addNewTag, setAddNewTag] = useState("");

  const [editRole, setEditRole] = useState("");
  const [editRoleTag, setEditRoleTag] = useState("");

  const [deleteRoleId, setDeleteRoleId] = useState("");

  useEffect(() => {
    const fetchRolesData = async () => {
      const iamRolesFetch = await request("GET", "/api/iam-roles");
      if (iamRolesFetch.ok) {
        setIamRoles(iamRolesFetch.data);
      }

      const rolesFetch = await request("GET", "/api/roles");
      if (rolesFetch.ok) {
        setRoles(rolesFetch.data);
      }

      setLoading(false);
    };

    fetchRolesData();
  }, []);

  const addNew = async () => {
    if (!addNewRole) return;

    const res = await request("POST", "/api/iam-roles", { roleId: addNewRole, tag: addNewTag });

    if (res.ok) {
      setIamRoles((prev) => [...prev, { roleId: addNewRole.toString(), roleName: roles.find((r) => r.id === addNewRole.toString())?.name ?? "Unknown role", tag: addNewTag }]);
      setAddNewRole("");
      setAddNewTag("");
    }
  };

  const startEditRole = (roleId: string) => {
    const role = iamRoles.find((x) => x.roleId === roleId);
    if (!role) return;

    setEditRole(role.roleId);
    setEditRoleTag(role.tag);
  };

  const finishEditRole = async () => {
    const res = await request("PATCH", "/api/iam-roles", { roleId: editRole, tag: editRoleTag });
    if (res.ok) {
      setIamRoles((prev) =>
        prev.map((x) => {
          if (x.roleId === editRole) {
            return { ...x, tag: editRoleTag };
          }
          return x;
        })
      );
      setEditRole("");
      setEditRoleTag("");
    }
  };

  const deleteModalState = useOverlayState();

  const deleteRole = async () => {
    const res = await request("DELETE", "/api/iam-roles", { id: deleteRoleId });

    if (res.ok) {
      setIamRoles((prev) => prev.filter((x) => x.roleId !== deleteRoleId));

      deleteModalState.close();
    }
  };

  if (loading) {
    return (
      <div>
        <Typography type="h1">!iam Roles</Typography>

        <Skeleton className="w-66 h-12 m-2 rounded-lg" />
        <Skeleton className="w-36 h-8 m-2 rounded-lg" />
        <Skeleton className="w-full h-8 m-2 rounded-lg" />
        <Skeleton className="w-36 h-8 m-2 rounded-lg" />
        <Skeleton className="w-full h-8 m-2 rounded-lg" />
        <Skeleton className="w-36 h-8 m-2 rounded-lg" />
        <Skeleton className="w-36 h-8 m-2 rounded-lg" />
        <Skeleton className="w-full h-8 m-2 rounded-lg" />
        <Skeleton className="w-full h-24 m-2 rounded-lg" />
      </div>
    );
  }

  return (
    <div>
      <Typography type="h1">!iam Roles</Typography>
      <Typography>
        Here you can configure roles that users can grab by running !iam &lt;rolename&gt;.
      </Typography>
      <Surface variant="secondary" className="p-4 rounded-xl m-1">
        <Typography type="h2">Add an !iam role</Typography>
        <Form className="flex flex-col gap-1">
          <Select
            value={addNewRole}
            onChange={(x) => setAddNewRole(x)}
            validate={(x) => {
              if (iamRoles.find((role) => role.roleId === x)) {
                return "This role already has a tag";
              }
              return true;
            }}
          >
            <Label>Role</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {roles.map((role) => (
                  <ListBox.Item key={role.id} id={role.id} textValue={role.name}>
                    <Typography>@{role.name}</Typography>
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
            <FieldError />
          </Select>

          <TextField
            value={addNewTag}
            onChange={(x) => setAddNewTag(x)}
            validate={(x) => {
              if (iamRoles.find((role) => role.tag === x)) {
                return "This tag is already used";
              }
              if (/^[a-z0-9]+$/.test(x)) {
                return true;
              }
              return "One word is required";
            }}
          >
            <Label htmlFor="Trigger">Trigger keyword</Label>
            <Input type="text" />
            <FieldError />
          </TextField>

          <Button
            className="mt-4"
            isDisabled={!addNewRole || !addNewTag ||
              !/^[a-z0-9]+$/.test(addNewTag) || !!iamRoles.find((role) => role.roleId === addNewRole)}
            onClick={addNew}
          >
            Add
          </Button>
        </Form>
      </Surface>

      <Table>
        <Table.ScrollContainer>
          <Table.Content>
            <Table.Header>
              <Table.Column isRowHeader>Role</Table.Column>
              <Table.Column>Trigger</Table.Column>
              <Table.Column>Actions</Table.Column>
            </Table.Header>
            <Table.Body>
              {iamRoles.map((iamRole) => (
                <Table.Row key={iamRole.roleId}>
                  <Table.Cell>
                    @{iamRole.roleName}
                  </Table.Cell>
                  <Table.Cell>
                    {editRole && iamRole.roleId === editRole
                      ? <Input type="text" variant="secondary" value={editRoleTag} onChange={(x) => setEditRoleTag(x.currentTarget.value)} />
                      : <Typography>{iamRole.tag}</Typography>}
                  </Table.Cell>
                  <Table.Cell className="flex gap-2">
                    {iamRole.roleId !== editRole && <Button isDisabled={!!editRole} onClick={() => startEditRole(iamRole.roleId)}>Edit</Button>}
                    {editRole && iamRole.roleId === editRole && <Button onClick={finishEditRole}>Save</Button>}
                    <Button
                      variant="danger"
                      onClick={() => {
                        setDeleteRoleId(iamRole.roleId);
                        deleteModalState.open();
                      }}
                    >
                      Delete
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>

      <Modal.Backdrop isOpen={deleteModalState.isOpen} onOpenChange={deleteModalState.setOpen}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Delete !iam role?</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              This action is irreversible, you'll have to re-add the role manually.
            </Modal.Body>
            <Modal.Footer>
              <Button onClick={deleteRole} variant="danger">Delete</Button>
              <Button slot="close">Cancel</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
};

export default ReactionRoles;
