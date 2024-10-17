import {
  Outlet,
  Link,
  useResolvedPath,
  LinkProps,
  useMatch,
} from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReactNode } from "react";

function NavLink({ children, to, ...props }: LinkProps) {
  let resolved = useResolvedPath(to);
  let match = useMatch({ path: resolved.pathname, end: true });

  return (
    <Link
      style={{ textDecoration: match ? "underline" : "none" }}
      to={to}
      {...props}
    >
      {children}
    </Link>
  );
}

export function Layout() {
  return (
    <div className="w-screen flex flex-col gap-4">
      <div className="flex flex-row justify-end p-4">
        <ConnectButton />
      </div>

      <nav className="flex flex-row justify-between gap-4 mx-auto max-w-sm">
        <NavLink to="/deposit">Deposit</NavLink>
        <NavLink to="/withdraw">Withdraw</NavLink>
        <NavLink to="/transfer">Transfer</NavLink>
      </nav>
      <main className="mx-auto max-w-md">
        <Outlet />
      </main>
    </div>
  );
}

export function CardLayout({
  children,
  actions,
  title,
}: // description
{
  children: ReactNode;
  actions?: ReactNode;
  title: ReactNode;
  // description: ReactNode;
}) {
  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {/*<CardDescription>{description}</CardDescription>*/}
      </CardHeader>
      <CardContent>{children}</CardContent>
      {actions && (
        <CardFooter className="flex justify-between flex-row">
          {actions}
        </CardFooter>
      )}
    </Card>
  );
}
