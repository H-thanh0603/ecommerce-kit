import type { SVGProps } from "react";
import {
  ChevronRight,
  Heart,
  MapPin,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
  User,
  X,
} from "lucide-react";

type IconProps = SVGProps<SVGSVGElement>;

export function IconSearch(props: IconProps) {
  return <Search strokeWidth={1.7} {...props} />;
}
export function IconBag(props: IconProps) {
  return <ShoppingBag strokeWidth={1.7} {...props} />;
}
export function IconUser(props: IconProps) {
  return <User strokeWidth={1.7} {...props} />;
}
export function IconHeart(props: IconProps) {
  return <Heart strokeWidth={1.7} {...props} />;
}
export function IconHeartFill(props: IconProps) {
  return <Heart fill="currentColor" strokeWidth={1.7} {...props} />;
}
export function IconMenu(props: IconProps) {
  return <Menu strokeWidth={1.7} {...props} />;
}
export function IconClose(props: IconProps) {
  return <X strokeWidth={1.7} {...props} />;
}
export function IconTruck(props: IconProps) {
  return <Truck strokeWidth={1.7} {...props} />;
}
export function IconShield(props: IconProps) {
  return <ShieldCheck strokeWidth={1.7} {...props} />;
}
export function IconRefresh(props: IconProps) {
  return <RefreshCw strokeWidth={1.7} {...props} />;
}
export function IconStar(props: IconProps) {
  return <Star fill="currentColor" strokeWidth={1.7} {...props} />;
}
export function IconChevron(props: IconProps) {
  return <ChevronRight strokeWidth={1.7} {...props} />;
}
export function IconPin(props: IconProps) {
  return <MapPin strokeWidth={1.7} {...props} />;
}
