import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useShellRoute } from '@/hooks/useShellRoute';
import { useTranslations } from 'next-intl';
import {
  BookOpenText,
  Inbox,
  LayoutDashboard,
  RefreshCw,
  SquareKanban,
  StickyNote,
  Target,
} from 'lucide-react';
import {
  cyclesPath,
  cyclesViewPath,
  dashboardsPath,
  documentsPath,
  inboxPath,
  initiativesPath,
  initiativesTabPath,
  notesPath,
  projectPath,
  viewPath,
} from '@/utils/paths';
import { usePermissions } from '@/hooks/usePermissions';
import { useProjectFeatures } from '@/hooks/useProjectFeatures';
import { useInboxUnread } from '@/hooks/useInboxUnread';
import { useViewsQuery } from '@/services/views.service';
import { useInitiativeCountsQuery } from '@/services/initiatives.service';
import { readCyclesView } from '@/features/cycles/utils/cyclesView';
import { readInitiativeTabOrder } from '@/features/initiatives/hooks/useInitiativeTabOrder';
import { tabCount } from '@/features/initiatives/utils/tabs';
import { viewIcon } from '@/utils/viewIcons';
import { SidebarGroup, SidebarGroupContent, SidebarMenu } from '@/components/ui/sidebar';
import SidebarNavItem from '@/components/layout/SidebarNavItem';
import SidebarNavSubmenu from '@/components/layout/SidebarNavSubmenu';

// The top sidebar group. An entry appears only when its project feature is on and
// the user may read the section.
export default function SidebarWorkNav({
  projectKey,
  projectId,
}: {
  projectKey: string | null;
  projectId: number | null;
}) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const routeSub = useShellRoute().sub;
  const { can } = usePermissions();
  const features = useProjectFeatures();
  const disabled = !projectKey;
  const { data: inboxUnread } = useInboxUnread(projectKey, projectId);
  const { data: views } = useViewsQuery(projectKey);
  const favorites = views?.filter((v) => v.favorite) ?? [];

  // The remembered cycles layout and the initiatives tab order live in
  // localStorage, which the server render cannot read. Resolving the target after
  // mount lets the sidebar link straight at the page it opens, so a click no longer
  // pays the extra client redirect at /cycles or /initiatives (one RSC round trip).
  // Until then the links point at the list paths, exactly as before.
  const { data: initiativeCounts } = useInitiativeCountsQuery(projectKey);
  const [cyclesHref, setCyclesHref] = useState<string | null>(null);
  const [initiativesHref, setInitiativesHref] = useState<string | null>(null);

  useEffect(() => {
    if (!projectKey) {
      setCyclesHref(null);
      setInitiativesHref(null);
      return;
    }
    setCyclesHref(cyclesViewPath(projectKey, readCyclesView(projectKey)));
    const tab = initiativeCounts
      ? (readInitiativeTabOrder().find((t) => (tabCount(initiativeCounts, t) ?? 0) > 0) ?? 'all')
      : null;
    setInitiativesHref(tab ? initiativesTabPath(projectKey, tab) : null);
  }, [projectKey, initiativeCounts]);

  // "Work items" is the default view: active on the project root and any segment
  // that is not one of the other top-level destinations.
  const onWorkItems =
    !!projectKey &&
    (pathname === projectPath(projectKey) ||
      pathname.startsWith(`${projectPath(projectKey)}/view`) ||
      routeSub === 'issue');

  // With favorites, Work items becomes a sub-list: the unfiltered board plus one
  // entry per favorite view.
  const workItemsSubmenu =
    projectKey && favorites.length > 0
      ? [
          {
            key: 'all',
            href: projectPath(projectKey),
            icon: SquareKanban,
            label: t('allWorkItems'),
            // Also the entry for a saved view that is not a favorite: it has no
            // row of its own, and the group would otherwise show nothing active.
            active: onWorkItems && !favorites.some((v) => pathname === viewPath(projectKey, v.id)),
          },
          ...favorites.map((v) => ({
            key: String(v.id),
            href: viewPath(projectKey, v.id),
            icon: viewIcon(v.icon),
            label: v.name,
            active: pathname === viewPath(projectKey, v.id),
          })),
        ]
      : null;

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarNavItem
            href={projectKey ? inboxPath(projectKey) : '#'}
            icon={Inbox}
            label={t('inbox')}
            active={pathname.endsWith('/inbox')}
            disabled={disabled}
            badge={inboxUnread}
          />
          {features.dashboards && can('dashboards', 'read') && (
            <SidebarNavItem
              href={projectKey ? dashboardsPath(projectKey) : '#'}
              icon={LayoutDashboard}
              label={t('dashboards')}
              active={pathname.includes('/dashboard')}
              disabled={disabled}
            />
          )}
          {workItemsSubmenu ? (
            <SidebarNavSubmenu
              icon={SquareKanban}
              label={t('workItems')}
              items={workItemsSubmenu}
            />
          ) : (
            <SidebarNavItem
              href={projectKey ? projectPath(projectKey) : '#'}
              icon={SquareKanban}
              label={t('workItems')}
              active={onWorkItems}
              disabled={disabled}
            />
          )}
          {features.initiatives && can('initiatives', 'read') && (
            <SidebarNavItem
              href={projectKey ? (initiativesHref ?? initiativesPath(projectKey)) : '#'}
              icon={Target}
              label={t('initiatives')}
              active={pathname.includes('/initiatives')}
              disabled={disabled}
            />
          )}
          {features.cycles && can('cycles', 'read') && (
            <SidebarNavItem
              href={projectKey ? (cyclesHref ?? cyclesPath(projectKey)) : '#'}
              icon={RefreshCw}
              label={t('cycles')}
              active={pathname.includes('/cycles')}
              disabled={disabled}
            />
          )}
          {features.documents && can('documents', 'read') && (
            <SidebarNavItem
              href={projectKey ? documentsPath(projectKey) : '#'}
              icon={BookOpenText}
              label={t('documents')}
              active={pathname.includes('/docs')}
              disabled={disabled}
            />
          )}
          {features.notes && can('note_boards', 'read') && (
            <SidebarNavItem
              href={projectKey ? notesPath(projectKey) : '#'}
              icon={StickyNote}
              label={t('notes')}
              active={pathname.includes('/notes')}
              disabled={disabled}
            />
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
